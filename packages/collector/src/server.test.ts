import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { CollectorConfig } from "./config.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCollectorServer } from "./server.js";

describe("collector server", () => {
  let workspaceDir = "";

  beforeEach(async () => {
    workspaceDir = await mkdtemp(join(tmpdir(), "wide-events-collector-"));
  });

  afterEach(async () => {
    if (workspaceDir) {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("ingests OTLP traces and serves query and trace results", async () => {
    const server = await createCollectorServer(
      createTestCollectorConfig({
        duckDbPath: join(workspaceDir, "events.duckdb"),
        batchSize: 10,
        batchTimeoutMs: 10,
      }),
    );

    try {
      const ingestResponse = await server.app.inject({
        method: "POST",
        url: "/v1/traces",
        payload: {
          resourceSpans: [
            {
              resource: {
                attributes: [
                  {
                    key: "service.name",
                    value: { stringValue: "payments" },
                  },
                ],
              },
              scopeSpans: [
                {
                  spans: [
                    {
                      traceId: "trace-1",
                      spanId: "span-1",
                      startTimeUnixNano: "1000000000",
                      endTimeUnixNano: "2000000000",
                      attributes: [
                        { key: "main", value: { boolValue: true } },
                        { key: "http.route", value: { stringValue: "/pay" } },
                        { key: "error", value: { boolValue: false } },
                      ],
                    },
                    {
                      traceId: "trace-1",
                      spanId: "span-2",
                      parentSpanId: "span-1",
                      startTimeUnixNano: "1100000000",
                      endTimeUnixNano: "1500000000",
                      attributes: [
                        {
                          key: "db.statement",
                          value: { stringValue: "select 1" },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      expect(ingestResponse.statusCode).toBe(202);

      const queryResponse = await server.app.inject({
        method: "POST",
        url: "/query",
        payload: {
          select: [{ fn: "COUNT", as: "total" }],
          filters: [{ field: "trace_id", op: "eq", value: "trace-1" }],
          scope: "all",
        },
      });

      expect(queryResponse.statusCode).toBe(200);
      expect(queryResponse.json().rows[0]?.["total"]).toBe(2);

      const mainOnlyResponse = await server.app.inject({
        method: "POST",
        url: "/query",
        payload: {
          select: [{ fn: "COUNT", as: "total" }],
          filters: [{ field: "trace_id", op: "eq", value: "trace-1" }],
        },
      });

      expect(mainOnlyResponse.statusCode).toBe(200);
      expect(mainOnlyResponse.json().rows[0]?.["total"]).toBe(1);

      const traceResponse = await server.app.inject({
        method: "GET",
        url: "/trace/trace-1",
      });

      expect(traceResponse.statusCode).toBe(200);
      expect(traceResponse.json().rows).toHaveLength(2);

      const columnsResponse = await server.app.inject({
        method: "GET",
        url: "/columns",
      });

      expect(columnsResponse.statusCode).toBe(200);
      expect(
        columnsResponse
          .json()
          .columns.some(
            (column: { name: string }) => column.name === "db.statement",
          ),
      ).toBe(true);

      const conflictingScopeResponse = await server.app.inject({
        method: "POST",
        url: "/query",
        payload: {
          select: [{ fn: "COUNT", as: "total" }],
          filters: [{ field: "main", op: "eq", value: true }],
        },
      });

      expect(conflictingScopeResponse.statusCode).toBe(400);
      expect(conflictingScopeResponse.json().error).toMatch(/scope "main"/);
    } finally {
      await server.close();
    }
  });

  it("returns 400 for malformed OTLP payloads", async () => {
    const server = await createCollectorServer(
      createTestCollectorConfig({
        duckDbPath: join(workspaceDir, "events.duckdb"),
        batchSize: 10,
        batchTimeoutMs: 10,
      }),
    );

    try {
      const response = await server.app.inject({
        method: "POST",
        url: "/v1/traces",
        payload: {
          resourceSpans: [
            {
              scopeSpans: [
                {
                  spans: [
                    {
                      spanId: "span-1",
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toMatch(/traceId/);
    } finally {
      await server.close();
    }
  });

  it("rejects mutating sql requests", async () => {
    const server = await createCollectorServer(
      createTestCollectorConfig({
        duckDbPath: join(workspaceDir, "events.duckdb"),
        batchSize: 10,
        batchTimeoutMs: 10,
      }),
    );

    try {
      const response = await server.app.inject({
        method: "POST",
        url: "/sql",
        payload: {
          sql: "DELETE FROM events",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toMatch(/read-only/);
    } finally {
      await server.close();
    }
  });

  it("returns 503 when the ingest queue is saturated", async () => {
    const server = await createCollectorServer(
      createTestCollectorConfig({
        duckDbPath: join(workspaceDir, "events.duckdb"),
        batchSize: 10,
        batchTimeoutMs: 5_000,
        queueLimit: 1,
      }),
    );

    try {
      const firstRequest = server.app.inject({
        method: "POST",
        url: "/v1/traces",
        payload: {
          resourceSpans: [
            {
              resource: {
                attributes: [
                  {
                    key: "service.name",
                    value: { stringValue: "payments" },
                  },
                ],
              },
              scopeSpans: [
                {
                  spans: [
                    {
                      traceId: "trace-1",
                      spanId: "span-1",
                      startTimeUnixNano: "1000000000",
                      endTimeUnixNano: "2000000000",
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 25));

      const secondResponse = await server.app.inject({
        method: "POST",
        url: "/v1/traces",
        payload: {
          resourceSpans: [
            {
              resource: {
                attributes: [
                  {
                    key: "service.name",
                    value: { stringValue: "payments" },
                  },
                ],
              },
              scopeSpans: [
                {
                  spans: [
                    {
                      traceId: "trace-2",
                      spanId: "span-2",
                      startTimeUnixNano: "1000000000",
                      endTimeUnixNano: "2000000000",
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      expect(secondResponse.statusCode).toBe(503);
      expect(secondResponse.json().error).toMatch(/queue limit exceeded/i);

      await server.dependencies.store.flush();
      const firstResponse = await firstRequest;
      expect(firstResponse.statusCode).toBe(202);
    } finally {
      await server.close();
  }
});

function createTestCollectorConfig(
  overrides: Partial<CollectorConfig>,
): CollectorConfig {
  return {
    duckDbPath: "unused",
    port: 4318,
    batchSize: 100,
    batchTimeoutMs: 1_000,
    retentionDays: 30,
    maxPromotedColumns: 200,
    promotionIntervalMs: 300_000,
    promotionMinRows: 1_000,
    promotionMinRatio: 0.01,
    promotionMaxKeysPerRun: 1,
    queueLimit: 10_000,
    ...overrides,
  };
}
});
