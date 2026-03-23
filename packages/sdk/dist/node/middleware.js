import { context, trace, SpanKind } from "@opentelemetry/api";
import { MAIN_SPAN_KEY } from "./runtime.js";
import { isSpanLike, setSpanAttributes } from "./span.js";
export function createMiddleware(runtime) {
    return (request, response, next) => {
        if (runtime.options.disabled || !runtime.shouldSample()) {
            next();
            return;
        }
        const parentContext = runtime.createParentContext(request.headers);
        const span = runtime.tracer.startSpan(request.url ?? `${request.method ?? "HTTP"} request`, {
            kind: SpanKind.SERVER,
            attributes: {
                main: true,
                sample_rate: runtime.options.sampleRate,
                "service.name": runtime.options.serviceName,
                "service.environment": runtime.options.environment,
                "http.request.method": request.method ?? undefined,
                "http.route": request.url ?? undefined
            }
        }, parentContext);
        const spanContext = trace.setSpan(parentContext, span).setValue(MAIN_SPAN_KEY, span);
        let finalized = false;
        const finalize = () => {
            if (finalized) {
                return;
            }
            finalized = true;
            span.setAttribute("http.status_code", response.statusCode ?? 200);
            span.setAttribute("error", typeof response.statusCode === "number" ? response.statusCode >= 500 : false);
            span.end();
        };
        response.once("finish", finalize);
        response.once("close", finalize);
        response.once("error", finalize);
        context.with(spanContext, next);
    };
}
export function annotateCurrentSpan(attributes) {
    const activeContext = context.active();
    const span = activeContext.getValue(MAIN_SPAN_KEY);
    if (!isSpanLike(span)) {
        return;
    }
    setSpanAttributes(span, attributes);
}
//# sourceMappingURL=middleware.js.map