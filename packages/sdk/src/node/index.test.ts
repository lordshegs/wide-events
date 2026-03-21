import { afterEach, describe, expect, it } from "vitest";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-node";
import { WideEvents } from "./index.js";

describe("node WideEvents", () => {
  afterEach(async () => {
  });

  it("exports the annotated root span on forceFlush", async () => {
    const exporter = new InMemorySpanExporter();

    const wideEvents = new WideEvents({
      serviceName: "payments",
      environment: "test",
      collectorUrl: "http://collector.test",
      traceExporter: exporter
    });

    const middleware = wideEvents.middleware();
    await new Promise<void>((resolve) => {
      const request = {
        method: "GET",
        url: "/checkout",
        headers: {}
      };

      const listeners = new Map<string, () => void>();
      const response = {
        statusCode: 204,
        once(event: "finish" | "close" | "error", listener: () => void) {
          listeners.set(event, listener);
          return this;
        }
      };

      middleware(request, response, () => {
        wideEvents.annotate({
          "user.id": "user-123",
          main: true
        });
        listeners.get("finish")?.();
        resolve();
      });
    });

    await wideEvents.forceFlush();

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0]?.attributes["user.id"]).toBe("user-123");
    expect(spans[0]?.attributes["http.route"]).toBe("/checkout");

    await wideEvents.shutdown();
  });
});
