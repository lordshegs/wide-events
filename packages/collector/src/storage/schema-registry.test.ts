import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BASELINE_COLUMN_NAMES } from "@wide-events/internal";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DuckDbDatabase } from "./database.js";
import { SchemaRegistry } from "./schema-registry.js";

describe("SchemaRegistry", () => {
  let database: DuckDbDatabase;
  let workspaceDir = "";

  beforeEach(async () => {
    workspaceDir = await mkdtemp(join(tmpdir(), "wide-events-schema-"));
    database = await DuckDbDatabase.create(join(workspaceDir, "events.duckdb"));
  });

  afterEach(async () => {
    database.close();
    await rm(workspaceDir, { recursive: true, force: true });
  });

  it("hydrates baseline columns and drops dynamic columns after maxColumns is reached", async () => {
    const registry = new SchemaRegistry(BASELINE_COLUMN_NAMES.length + 1);
    await registry.hydrate(database);

    const dropped = await registry.ensureDynamicColumns(database, [
      "custom.one",
      "custom.two"
    ]);

    expect(dropped).toEqual(["custom.two"]);
    expect(registry.isKnownColumn("custom.one")).toBe(true);
    expect(registry.isKnownColumn("custom.two")).toBe(false);

    const tableInfo = await database.executeWriteQuery("PRAGMA table_info('events')");
    expect(tableInfo.some((row) => row["name"] === "custom.one")).toBe(true);
    expect(tableInfo.some((row) => row["name"] === "custom.two")).toBe(false);
  });
});
