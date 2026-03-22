import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BASELINE_COLUMN_NAMES, type FlatEventRow } from "@wide-events/internal";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CollectorConfig } from "../config.js";
import { QueueLimitExceededError } from "../errors.js";
import type { CollectorLogger } from "../logger.js";
import { DuckDbDatabase } from "./database.js";
import { SchemaRegistry } from "./schema-registry.js";
import { CollectorStore } from "./store.js";

interface LoggedEvent {
  bindings: Record<string, unknown>;
  message: string;
}

function createRow(
  suffix: string,
  attributes: Record<string, string> = {},
  ts: string = "2024-01-01T00:00:00.000Z"
): FlatEventRow {
  return {
    trace_id: `trace-${suffix}`,
    span_id: `span-${suffix}`,
    parent_span_id: null,
    ts,
    duration_ms: 10,
    main: true,
    sample_rate: 1,
    "service.name": "payments",
    "service.environment": "test",
    "service.version": null,
    "http.route": "/checkout",
    "http.status_code": 200,
    "http.request.method": "GET",
    error: false,
    "exception.slug": null,
    "user.id": null,
    "user.type": null,
    "user.org.id": null,
    ...attributes
  };
}

function createLogger(): {
  errors: LoggedEvent[];
  infos: LoggedEvent[];
  logger: CollectorLogger;
  warns: LoggedEvent[];
} {
  const infos: LoggedEvent[] = [];
  const warns: LoggedEvent[] = [];
  const errors: LoggedEvent[] = [];

  return {
    infos,
    warns,
    errors,
    logger: {
      info(bindings, message) {
        infos.push({ bindings, message });
      },
      warn(bindings, message) {
        warns.push({ bindings, message });
      },
      error(bindings, message) {
        errors.push({ bindings, message });
      }
    }
  };
}

describe("CollectorStore", () => {
  let database: DuckDbDatabase;
  let workspaceDir = "";

  beforeEach(async () => {
    workspaceDir = await mkdtemp(join(tmpdir(), "wide-events-store-"));
    database = await DuckDbDatabase.create(join(workspaceDir, "events.duckdb"));
  });

  afterEach(async () => {
    database.close();
    await rm(workspaceDir, { recursive: true, force: true });
  });

  it("flushes when the batch size is reached", async () => {
    const schema = new SchemaRegistry(200);
    await schema.hydrate(database);
    const store = new CollectorStore(database, schema, configOverrides({
      batchSize: 2,
      batchTimeoutMs: 5_000
    }));

    let firstResolved = false;
    const firstBatch = store.enqueueRows([createRow("one")]).then(() => {
      firstResolved = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(firstResolved).toBe(false);

    await Promise.all([firstBatch, store.enqueueRows([createRow("two")])]);

    const rows = await database.executeRead("SELECT COUNT(*) AS total FROM events");
    expect(rows[0]?.total).toBe(2);
  });

  it("flushes on the batch timeout", async () => {
    const schema = new SchemaRegistry(200);
    await schema.hydrate(database);
    const store = new CollectorStore(database, schema, configOverrides({
      batchSize: 10,
      batchTimeoutMs: 25
    }));

    await store.enqueueRows([createRow("one")]);

    const rows = await database.executeRead("SELECT COUNT(*) AS total FROM events");
    expect(rows[0]?.total).toBe(1);
  });

  it("returns a queue saturation error when the pending queue exceeds the limit", async () => {
    const schema = new SchemaRegistry(200);
    await schema.hydrate(database);
    const store = new CollectorStore(database, schema, configOverrides({
      batchSize: 10,
      batchTimeoutMs: 5_000,
      queueLimit: 1
    }));

    const firstBatch = store.enqueueRows([createRow("one")]);

    await expect(store.enqueueRows([createRow("two")])).rejects.toBeInstanceOf(
      QueueLimitExceededError
    );

    await store.flush();
    await firstBatch;
  });

  it("drops dynamic columns that exceed the schema cap and still inserts the row", async () => {
    const schema = new SchemaRegistry(BASELINE_COLUMN_NAMES.length + 1);
    await schema.hydrate(database);
    const { logger, warns } = createLogger();
    const store = new CollectorStore(
      database,
      schema,
      configOverrides({
        batchSize: 1,
        batchTimeoutMs: 5
      }),
      logger
    );

    await store.enqueueRows([
      createRow("one", {
        "custom.one": "alpha",
        "custom.two": "beta"
      })
    ]);

    const columns = schema.listColumns().map((column) => column.name);
    expect(columns).toContain("custom.one");
    expect(columns).not.toContain("custom.two");

    const rows = await database.executeRead(
      'SELECT "custom.one" AS custom_one FROM events WHERE trace_id = ?',
      ["trace-one"]
    );
    expect(rows[0]?.custom_one).toBe("alpha");
    expect(
      warns.some((entry) =>
        entry.message.includes("collector dropped dynamic columns after reaching schema cap")
      )
    ).toBe(true);
  });

  it("serializes concurrent schema changes across ingest batches", async () => {
    const schema = new SchemaRegistry(200);
    await schema.hydrate(database);
    const store = new CollectorStore(database, schema, configOverrides({
      batchSize: 1,
      batchTimeoutMs: 5
    }));

    await Promise.all([
      store.enqueueRows([
        createRow("one", {
          "custom.one": "alpha",
          "shared.value": "left"
        })
      ]),
      store.enqueueRows([
        createRow("two", {
          "custom.two": "beta",
          "shared.value": "right"
        })
      ])
    ]);

    const rows = await database.executeRead(
      'SELECT COUNT(*) AS total, MIN("shared.value") AS first_shared, MAX("shared.value") AS last_shared FROM events'
    );
    expect(rows[0]?.total).toBe(2);
    expect(rows[0]?.first_shared).toBe("left");
    expect(rows[0]?.last_shared).toBe("right");
  });

  it("serializes retention alongside ingest", async () => {
    const schema = new SchemaRegistry(200);
    await schema.hydrate(database);
    const { logger, infos } = createLogger();
    const store = new CollectorStore(
      database,
      schema,
      configOverrides({
        batchSize: 1,
        batchTimeoutMs: 5,
        retentionDays: 30
      }),
      logger
    );

    await store.enqueueRows([
      createRow("old", {}, "2024-01-01T00:00:00.000Z")
    ]);

    await Promise.all([
      store.runRetention(new Date("2024-03-15T00:00:00.000Z")),
      store.enqueueRows([createRow("new", {}, "2024-03-14T00:00:00.000Z")])
    ]);

    const rows = await database.executeRead(
      "SELECT trace_id FROM events ORDER BY trace_id ASC"
    );
    expect(rows).toEqual([{ trace_id: "trace-new" }]);
    expect(
      infos.some((entry) => entry.message === "collector retention started")
    ).toBe(true);
    expect(
      infos.some((entry) => entry.message === "collector retention completed")
    ).toBe(true);
  });
});

function configOverrides(
  overrides: Partial<CollectorConfig>
): CollectorConfig {
  return {
    duckDbPath: "unused",
    port: 4318,
    batchSize: 100,
    batchTimeoutMs: 1_000,
    retentionDays: 30,
    maxColumns: 200,
    queueLimit: 10_000,
    ...overrides
  };
}
