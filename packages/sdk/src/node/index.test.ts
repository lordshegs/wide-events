import { afterEach, describe, expect, it, vi } from "vitest";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-node";
import { WideEvents } from "./index.js";
import {
  getRuntimeRegistrySnapshotForTests,
  resetNodeRuntimeRegistryForTests
} from "./runtime-registry.js";

describe("node WideEvents", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await resetNodeRuntimeRegistryForTests();
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

  it("does nothing when annotate is called outside an active request context", async () => {
    const exporter = new InMemorySpanExporter();
    const wideEvents = new WideEvents({
      serviceName: "payments",
      environment: "test",
      collectorUrl: "http://collector.test",
      traceExporter: exporter
    });

    wideEvents.annotate({
      "user.id": "user-123"
    });
    await wideEvents.forceFlush();

    expect(exporter.getFinishedSpans()).toHaveLength(0);
    await wideEvents.shutdown();
  });

  it("adds internal promotion hint attributes to the exported span", async () => {
    const exporter = new InMemorySpanExporter();
    const wideEvents = new WideEvents({
      serviceName: "payments",
      environment: "test",
      collectorUrl: "http://collector.test",
      traceExporter: exporter
    });

    const middleware = wideEvents.middleware();
    await new Promise<void>((resolve) => {
      const listeners = new Map<string, () => void>();
      const response = {
        statusCode: 204,
        once(event: "finish" | "close" | "error", listener: () => void) {
          listeners.set(event, listener);
          return this;
        }
      };

      middleware(
        {
          method: "GET",
          url: "/checkout",
          headers: {}
        },
        response,
        () => {
          wideEvents.annotate(
            {
              "custom.value": "alpha"
            },
            { promote: ["custom.value"] }
          );
          listeners.get("finish")?.();
          resolve();
        }
      );
    });

    await wideEvents.forceFlush();

    const span = exporter.getFinishedSpans()[0];
    expect(span?.attributes["custom.value"]).toBe("alpha");
    expect(span?.attributes["wide_events.promote.custom.value"]).toBe(true);

    await wideEvents.shutdown();
  });

  it("throws for missing or baseline promotion keys", async () => {
    const exporter = new InMemorySpanExporter();
    const wideEvents = new WideEvents({
      serviceName: "payments",
      environment: "test",
      collectorUrl: "http://collector.test",
      traceExporter: exporter
    });

    expect(() => {
      wideEvents.annotate(
        { "custom.value": "alpha" },
        { promote: ["custom.missing" as "custom.value"] }
      );
    }).toThrow(/promote key "custom.missing" is missing/);

    expect(() => {
      wideEvents.annotate(
        { "user.id": "u_123" },
        { promote: ["user.id"] }
      );
    }).toThrow(/cannot promote baseline column "user.id"/);

    await wideEvents.shutdown();
  });

  it("skips runtime registration and export when disabled", async () => {
    const exporter = new InMemorySpanExporter();
    const wideEvents = new WideEvents({
      serviceName: "payments",
      environment: "test",
      collectorUrl: "http://collector.test",
      disabled: true,
      traceExporter: exporter
    });

    await wideEvents.forceFlush();
    expect(getRuntimeRegistrySnapshotForTests()).toBeNull();
    expect(exporter.getFinishedSpans()).toHaveLength(0);
    await wideEvents.shutdown();
  });

  it("skips unsampled requests when sampleRate is greater than one", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const exporter = new InMemorySpanExporter();
    const wideEvents = new WideEvents({
      serviceName: "payments",
      environment: "test",
      collectorUrl: "http://collector.test",
      sampleRate: 10,
      traceExporter: exporter
    });

    const middleware = wideEvents.middleware();
    const response = {
      statusCode: 200,
      once() {
        return this;
      }
    };

    middleware(
      {
        method: "GET",
        url: "/checkout",
        headers: {}
      },
      response,
      () => {
        wideEvents.annotate({
          main: true
        });
      }
    );

    await wideEvents.forceFlush();
    expect(exporter.getFinishedSpans()).toHaveLength(0);
    await wideEvents.shutdown();
  });

  it("reuses the active runtime when options are identical", async () => {
    const exporter = new InMemorySpanExporter();
    const first = new WideEvents({
      serviceName: "payments",
      environment: "test",
      collectorUrl: "http://collector.test",
      traceExporter: exporter
    });

    expect(getRuntimeRegistrySnapshotForTests()?.references).toBe(1);

    const second = new WideEvents({
      serviceName: "payments",
      environment: "test",
      collectorUrl: "http://collector.test",
      traceExporter: exporter
    });

    expect(getRuntimeRegistrySnapshotForTests()?.references).toBe(2);

    await second.shutdown();
    expect(getRuntimeRegistrySnapshotForTests()?.references).toBe(1);

    await first.shutdown();
    expect(getRuntimeRegistrySnapshotForTests()).toBeNull();
  });

  it("throws when a second runtime is created with different options", async () => {
    const first = new WideEvents({
      serviceName: "payments",
      environment: "test",
      collectorUrl: "http://collector.test",
      traceExporter: new InMemorySpanExporter()
    });

    expect(() => {
      return new WideEvents({
        serviceName: "checkout",
        environment: "test",
        collectorUrl: "http://collector.test",
        traceExporter: new InMemorySpanExporter()
      });
    }).toThrow(/active Node runtime/);

    await first.shutdown();
  });
});
