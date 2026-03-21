import { describe, expect, it, vi } from "vitest";
import { WideEvents } from "./index.js";

describe("edge WideEvents", () => {
  it("exports a single OTLP span with propagated trace context", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 202 })
    );
    const wideEvents = new WideEvents({
      serviceName: "edge-service",
      collectorUrl: "http://collector.test",
      environment: "test"
    });

    wideEvents.setParentContext(
      "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01"
    );
    wideEvents.annotate({
      main: true,
      "http.route": "/edge"
    });
    await wideEvents.flush(fetchImpl);

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as {
      resourceSpans: Array<{
        scopeSpans: Array<{
          spans: Array<{
            traceId: string;
            parentSpanId?: string;
            attributes: Array<{ key: string }>;
          }>;
        }>;
      }>;
    };

    const span = body.resourceSpans[0]?.scopeSpans[0]?.spans[0];
    expect(span?.traceId).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(span?.parentSpanId).toBe("bbbbbbbbbbbbbbbb");
    expect(span?.attributes.some((attribute) => attribute.key === "http.route")).toBe(
      true
    );
  });
});
