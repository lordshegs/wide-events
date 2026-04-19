import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveNodeOptions } from "./options";

describe("resolveNodeOptions", () => {
  const originalLambdaFunctionName = process.env["AWS_LAMBDA_FUNCTION_NAME"];

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalLambdaFunctionName === undefined) {
      delete process.env["AWS_LAMBDA_FUNCTION_NAME"];
      return;
    }

    process.env["AWS_LAMBDA_FUNCTION_NAME"] = originalLambdaFunctionName;
  });

  it("defaults aws auto-instrumentation to false outside lambda", () => {
    delete process.env["AWS_LAMBDA_FUNCTION_NAME"];

    const options = resolveNodeOptions({
      serviceName: "payments",
      collectorUrl: "http://collector.test"
    });

    expect(options.autoInstrument.aws).toBe(false);
  });

  it("defaults aws auto-instrumentation to true in lambda", () => {
    process.env["AWS_LAMBDA_FUNCTION_NAME"] = "example-handler";

    const options = resolveNodeOptions({
      serviceName: "payments",
      collectorUrl: "http://collector.test"
    });

    expect(options.autoInstrument.aws).toBe(true);
  });

  it("lets explicit aws=false override the lambda default", () => {
    process.env["AWS_LAMBDA_FUNCTION_NAME"] = "example-handler";

    const options = resolveNodeOptions({
      serviceName: "payments",
      collectorUrl: "http://collector.test",
      autoInstrument: {
        aws: false
      }
    });

    expect(options.autoInstrument.aws).toBe(false);
  });

  it("lets explicit aws=true enable auto-instrumentation outside lambda", () => {
    delete process.env["AWS_LAMBDA_FUNCTION_NAME"];

    const options = resolveNodeOptions({
      serviceName: "payments",
      collectorUrl: "http://collector.test",
      autoInstrument: {
        aws: true
      }
    });

    expect(options.autoInstrument.aws).toBe(true);
  });
});
