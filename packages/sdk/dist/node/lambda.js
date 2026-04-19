import { SpanKind, context, trace } from "@opentelemetry/api";
import { MAIN_SPAN_KEY } from "./runtime.js";
import { isSpanLike, setSpanAttributes } from "./span.js";
export function wrapLambdaHandler(runtime, handler) {
    return async (event, invocationContext) => {
        if (runtime.options.disabled || !runtime.shouldSample()) {
            return await handler(event, invocationContext);
        }
        const parentContext = runtime.createParentContext(extractHeaders(event));
        const span = runtime.tracer.startSpan("lambda invocation", {
            kind: SpanKind.SERVER,
            attributes: {
                main: true,
                sample_rate: runtime.options.sampleRate,
                "service.name": runtime.options.serviceName,
                "service.environment": runtime.options.environment
            }
        }, parentContext);
        const activeContext = trace
            .setSpan(parentContext, span)
            .setValue(MAIN_SPAN_KEY, span);
        try {
            return await context.with(activeContext, async () => {
                annotateLambdaContext(runtime, invocationContext);
                return await handler(event, invocationContext);
            });
        }
        catch (error) {
            span.setAttribute("error", true);
            span.recordException(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
        finally {
            span.end();
            await runtime.forceFlush();
        }
    };
}
function extractHeaders(event) {
    return event.headers ?? {};
}
function annotateLambdaContext(runtime, invocationContext) {
    const attributes = {
        "lambda.request_id": typeof invocationContext["awsRequestId"] === "string"
            ? invocationContext["awsRequestId"]
            : null,
        "lambda.function_name": typeof invocationContext["functionName"] === "string"
            ? invocationContext["functionName"]
            : null,
        "lambda.function_arn": typeof invocationContext["invokedFunctionArn"] === "string"
            ? invocationContext["invokedFunctionArn"]
            : null,
        "lambda.memory_mb": typeof invocationContext["memoryLimitInMB"] === "string"
            ? Number.parseInt(invocationContext["memoryLimitInMB"], 10)
            : null,
        "service.name": runtime.options.serviceName
    };
    const span = context.active().getValue(MAIN_SPAN_KEY);
    if (!isSpanLike(span)) {
        return;
    }
    setSpanAttributes(span, attributes);
}
//# sourceMappingURL=lambda.js.map