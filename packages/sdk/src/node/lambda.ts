import { SpanKind, context, trace } from "@opentelemetry/api";
import { MAIN_SPAN_KEY, type NodeWideEventsRuntime } from "./runtime.js";
import { normalizeAttributes, type AnnotationAttributes } from "../shared/attributes.js";
import { isSpanLike, setSpanAttributes } from "./span.js";

interface HeaderCarrier {
  headers?: Record<string, string | undefined>;
}

export function wrapLambdaHandler<TEvent, TContext, TResult>(
  runtime: NodeWideEventsRuntime,
  handler: (event: TEvent, context: TContext) => Promise<TResult> | TResult
) {
  return async (event: TEvent, invocationContext: TContext): Promise<TResult> => {
    if (runtime.options.disabled || !runtime.shouldSample()) {
      return await handler(event, invocationContext);
    }

    const parentContext = runtime.createParentContext(
      extractHeaders(event as HeaderCarrier)
    );
    const span = runtime.tracer.startSpan(
      "lambda invocation",
      {
        kind: SpanKind.SERVER,
        attributes: {
          main: true,
          sample_rate: runtime.options.sampleRate,
          "service.name": runtime.options.serviceName,
          "service.environment": runtime.options.environment
        }
      },
      parentContext
    );

    const activeContext = trace
      .setSpan(parentContext, span)
      .setValue(MAIN_SPAN_KEY, span);

    try {
      return await context.with(activeContext, async () => {
        annotateLambdaContext(runtime, invocationContext as Record<string, unknown>);
        return await handler(event, invocationContext);
      });
    } catch (error) {
      span.setAttribute("error", true);
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
      await runtime.forceFlush();
    }
  };
}

function extractHeaders(event: HeaderCarrier): Record<string, string | undefined> {
  return event.headers ?? {};
}

function annotateLambdaContext(
  runtime: NodeWideEventsRuntime,
  invocationContext: Record<string, unknown>
): void {
  const attributes: AnnotationAttributes = {
    "lambda.request_id":
      typeof invocationContext["awsRequestId"] === "string"
        ? invocationContext["awsRequestId"]
        : undefined,
    "lambda.function_name":
      typeof invocationContext["functionName"] === "string"
        ? invocationContext["functionName"]
        : undefined,
    "lambda.function_arn":
      typeof invocationContext["invokedFunctionArn"] === "string"
        ? invocationContext["invokedFunctionArn"]
        : undefined,
    "lambda.memory_mb":
      typeof invocationContext["memoryLimitInMB"] === "string"
        ? Number.parseInt(invocationContext["memoryLimitInMB"], 10)
        : undefined
  };

  const span = context.active().getValue(MAIN_SPAN_KEY);
  if (!isSpanLike(span)) {
    return;
  }

  setSpanAttributes(span, {
    ...normalizeAttributes(attributes),
    "service.name": runtime.options.serviceName
  });
}
