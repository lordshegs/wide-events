import { describe, expect, it, vi } from "vitest";
import { WideEvents } from "./index.js";

describe("edge WideEvents", () => {
  it("does not export when disabled", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const wideEvents = new WideEvents({
      serviceName: "edge-service",
      collectorUrl: "http://collector.test",
      environment: "test",
      disabled: true
    });

    await wideEvents.flush(fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("skips unsampled exports deterministically", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const fetchImpl = vi.fn<typeof fetch>();
    const wideEvents = new WideEvents({
      serviceName: "edge-service",
      collectorUrl: "http://collector.test",
      environment: "test",
      sampleRate: 10
    });

    await wideEvents.flush(fetchImpl);
    await wideEvents.flush(fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

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

  it("ignores invalid traceparent values", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 202 })
    );
    const wideEvents = new WideEvents({
      serviceName: "edge-service",
      collectorUrl: "http://collector.test",
      environment: "test"
    });

    wideEvents.setParentContext("not-a-traceparent");
    await wideEvents.flush(fetchImpl);

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as {
      resourceSpans: Array<{
        scopeSpans: Array<{
          spans: Array<{
            parentSpanId?: string;
          }>;
        }>;
      }>;
    };

    const span = body.resourceSpans[0]?.scopeSpans[0]?.spans[0];
    expect(span?.parentSpanId).toBeUndefined();
  });

  it("exports at most once after a successful flush", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 202 })
    );
    const wideEvents = new WideEvents({
      serviceName: "edge-service",
      collectorUrl: "http://collector.test",
      environment: "test"
    });

    await wideEvents.flush(fetchImpl);
    await wideEvents.flush(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("surfaces export failures", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("collector exploded", { status: 500 })
    );
    const wideEvents = new WideEvents({
      serviceName: "edge-service",
      collectorUrl: "http://collector.test",
      environment: "test"
    });

    await expect(wideEvents.flush(fetchImpl)).rejects.toThrow(/Telemetry export failed/);
  });
});
