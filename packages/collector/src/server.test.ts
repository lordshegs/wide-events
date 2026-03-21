import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
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
    const server = await createCollectorServer({
      duckDbPath: join(workspaceDir, "events.duckdb"),
      port: 4318,
      batchSize: 10,
      batchTimeoutMs: 10,
      retentionDays: 30,
      maxColumns: 200,
      queueLimit: 1_000
    });

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
                    value: { stringValue: "payments" }
                  }
                ]
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
                        { key: "error", value: { boolValue: false } }
                      ]
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
                          value: { stringValue: "select 1" }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      });

      expect(ingestResponse.statusCode).toBe(202);

      const queryResponse = await server.app.inject({
        method: "POST",
        url: "/query",
        payload: {
          select: [{ fn: "COUNT", as: "total" }],
          filters: [{ field: "trace_id", op: "eq", value: "trace-1" }]
        }
      });

      expect(queryResponse.statusCode).toBe(200);
      expect(queryResponse.json().rows[0]?.total).toBe(2);

      const traceResponse = await server.app.inject({
        method: "GET",
        url: "/trace/trace-1"
      });

      expect(traceResponse.statusCode).toBe(200);
      expect(traceResponse.json().rows).toHaveLength(2);

      const columnsResponse = await server.app.inject({
        method: "GET",
        url: "/columns"
      });

      expect(columnsResponse.statusCode).toBe(200);
      expect(
        columnsResponse
          .json()
          .columns.some((column: { name: string }) => column.name === "db.statement")
      ).toBe(true);
    } finally {
      await server.close();
    }
  });

  it("rejects mutating sql requests", async () => {
    const server = await createCollectorServer({
      duckDbPath: join(workspaceDir, "events.duckdb"),
      port: 4318,
      batchSize: 10,
      batchTimeoutMs: 10,
      retentionDays: 30,
      maxColumns: 200,
      queueLimit: 1_000
    });

    try {
      const response = await server.app.inject({
        method: "POST",
        url: "/sql",
        payload: {
          sql: "DELETE FROM events"
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toMatch(/read-only/);
    } finally {
      await server.close();
    }
  });
});
