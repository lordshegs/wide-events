import { context, trace, SpanKind } from "@opentelemetry/api";
import type { DynamicEventAttributes } from "@wide-events/internal";
import { MAIN_SPAN_KEY, type NodeWideEventsRuntime } from "./runtime.js";
import { isSpanLike, setSpanAttributes } from "./span.js";

export interface MiddlewareRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface MiddlewareResponse {
  statusCode?: number;
  once(event: "finish" | "close" | "error", listener: () => void): this;
}

export type MiddlewareNext = () => void;

export function createMiddleware(runtime: NodeWideEventsRuntime) {
  return (request: MiddlewareRequest, response: MiddlewareResponse, next: MiddlewareNext) => {
    if (runtime.options.disabled || !runtime.shouldSample()) {
      next();
      return;
    }

    const parentContext = runtime.createParentContext(request.headers);
    const span = runtime.tracer.startSpan(
      request.url ?? `${request.method ?? "HTTP"} request`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          main: true,
          sample_rate: runtime.options.sampleRate,
          "service.name": runtime.options.serviceName,
          "service.environment": runtime.options.environment,
          "http.request.method": request.method ?? undefined,
          "http.route": request.url ?? undefined
        }
      },
      parentContext
    );

    const spanContext = trace.setSpan(parentContext, span).setValue(MAIN_SPAN_KEY, span);

    const finalize = () => {
      span.setAttribute("http.status_code", response.statusCode ?? 200);
      span.setAttribute(
        "error",
        typeof response.statusCode === "number" ? response.statusCode >= 500 : false
      );
      span.end();
    };

    response.once("finish", finalize);
    response.once("close", finalize);
    response.once("error", finalize);

    context.with(spanContext, next);
  };
}

export function annotateCurrentSpan(attributes: DynamicEventAttributes): void {
  const activeContext = context.active();
  const span = activeContext.getValue(MAIN_SPAN_KEY);
  if (!isSpanLike(span)) {
    return;
  }

  setSpanAttributes(span, attributes);
}
