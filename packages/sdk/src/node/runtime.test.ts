import { describe, expect, it } from "vitest";
import { createNodeInstrumentations } from "./runtime";

function createOptions(aws: boolean, disabled = false) {
  return {
    serviceName: "payments",
    environment: "test",
    collectorUrl: "http://collector.test",
    sampleRate: 1,
    disabled,
    autoInstrument: {
      http: true,
      postgres: true,
      redis: true,
      fetch: true,
      aws
    }
  };
}

describe("createNodeInstrumentations", () => {
  it("adds aws instrumentation only when enabled", () => {
    const withoutAws = createNodeInstrumentations(createOptions(false));
    const withAws = createNodeInstrumentations(createOptions(true));

    expect(withoutAws.map((item) => item.instrumentationName)).not.toContain(
      "@opentelemetry/instrumentation-aws-sdk"
    );
    expect(withAws.map((item) => item.instrumentationName)).toContain(
      "@opentelemetry/instrumentation-aws-sdk"
    );
  });

  it("returns no instrumentations when disabled", () => {
    expect(createNodeInstrumentations(createOptions(true, true))).toEqual([]);
  });
});
