import { describe, expect, it } from "vitest";
import { flattenTraceRequest } from "./flatten.js";

describe("flattenTraceRequest", () => {
  it("flattens spans and preserves baseline and dynamic attributes", () => {
    const rows = flattenTraceRequest({
      resourceSpans: [
        {
          resource: {
            attributes: [{ key: "service.name", value: { stringValue: "api" } }]
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
                    { key: "http.route", value: { stringValue: "/health" } },
                    { key: "custom.value", value: { intValue: "42" } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.trace_id).toBe("trace-1");
    expect(rows[0]?.main).toBe(true);
    expect(rows[0]?.["service.name"]).toBe("api");
    expect(rows[0]?.["http.route"]).toBe("/health");
    expect(rows[0]?.["custom.value"]).toBe("42");
    expect(rows[0]?.duration_ms).toBe(1_000);
  });
});
