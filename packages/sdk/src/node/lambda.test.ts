import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithRequestContext,
  APIGatewayProxyResultV2,
  APIGatewayEventRequestContextV2,
  Context,
} from "aws-lambda";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-node";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WideEvents } from "./index.js";
import { resetNodeRuntimeRegistryForTests } from "./runtime-registry.js";

describe("wrapLambdaHandler", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await resetNodeRuntimeRegistryForTests();
  });

  it("flushes successful invocations and annotates lambda context", async () => {
    const exporter = new InMemorySpanExporter();
    const wideEvents = new WideEvents({
      serviceName: "lambda-service",
      environment: "test",
      collectorUrl: "http://collector.test",
      traceExporter: exporter,
    });

    const handler = wideEvents.wrapHandler<
      APIGatewayProxyEventV2,
      Context,
      Exclude<APIGatewayProxyResultV2, string>
    >(async (event) => {
      wideEvents.annotate({
        main: true,
        "http.request.method": event.requestContext.http.method,
        "http.route": event.rawPath,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      };
    });

    const result = await handler(createEvent(), createContext());
    expect(result.statusCode).toBe(200);

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0]?.attributes["lambda.request_id"]).toBe("aws-request-id");
    expect(spans[0]?.attributes["http.route"]).toBe("/lambda");
    expect(spans[0]?.attributes["service.name"]).toBe("lambda-service");

    await wideEvents.shutdown();
  });

  it("records exceptions and still flushes in finally", async () => {
    const exporter = new InMemorySpanExporter();
    const wideEvents = new WideEvents({
      serviceName: "lambda-service",
      environment: "test",
      collectorUrl: "http://collector.test",
      traceExporter: exporter,
    });

    const handler = wideEvents.wrapHandler<
      APIGatewayProxyEventV2,
      Context,
      Exclude<APIGatewayProxyResultV2, string>
    >(async () => {
      wideEvents.annotate({
        main: true,
        "http.route": "/boom",
      });
      throw new Error("boom");
    });

    await expect(handler(createEvent(), createContext())).rejects.toThrow(
      "boom",
    );

    const span = exporter.getFinishedSpans()[0];
    expect(span?.attributes["error"]).toBe(true);
    expect(span?.events.some((event) => event.name === "exception")).toBe(true);

    await wideEvents.shutdown();
  });

  it("adopts upstream trace context from lambda event headers", async () => {
    const exporter = new InMemorySpanExporter();
    const wideEvents = new WideEvents({
      serviceName: "lambda-service",
      environment: "test",
      collectorUrl: "http://collector.test",
      traceExporter: exporter,
    });

    const handler = wideEvents.wrapHandler<
      APIGatewayProxyEventV2,
      Context,
      Exclude<APIGatewayProxyResultV2, string>
    >(async () => ({
      statusCode: 204,
    }));

    await handler(
      createEvent({
        traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
      }),
      createContext(),
    );

    const span = exporter.getFinishedSpans()[0];
    expect(span?.spanContext().traceId).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(span?.parentSpanContext?.spanId).toBe("bbbbbbbbbbbbbbbb");

    await wideEvents.shutdown();
  });
});

function createEvent(
  headers: Record<string, string> = {},
): APIGatewayProxyEventV2WithRequestContext<APIGatewayEventRequestContextV2> {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/lambda",
    rawQueryString: "",
    headers,
    requestContext: {
      accountId: "account",
      apiId: "api-id",
      domainName: "example.execute-api.us-east-1.amazonaws.com",
      domainPrefix: "example",
      http: {
        method: "GET",
        path: "/lambda",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "vitest",
      },
      requestId: "request-id",
      routeKey: "$default",
      stage: "$default",
      time: "01/Jan/2024:00:00:00 +0000",
      timeEpoch: 1,
    },
    isBase64Encoded: false,
  };
}

function createContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: "example-handler",
    functionVersion: "$LATEST",
    invokedFunctionArn:
      "arn:aws:lambda:us-east-1:123456789012:function:example-handler",
    memoryLimitInMB: "128",
    awsRequestId: "aws-request-id",
    logGroupName: "/aws/lambda/example-handler",
    logStreamName: "2024/01/01/[$LATEST]abcdef",
    getRemainingTimeInMillis() {
      return 10_000;
    },
    done() {},
    fail() {},
    succeed() {},
  };
}
