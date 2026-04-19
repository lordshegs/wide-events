import { trace, type Span } from "@opentelemetry/api";
import type { DynamicEventAttributes } from "@wide-events/internal";
import { toSpanAttributes } from "../shared/attributes";

export function isSpanLike(value: unknown): value is Span {
  return (
    typeof value === "object" &&
    value !== null &&
    "setAttributes" in value &&
    typeof value.setAttributes === "function"
  );
}

export function setSpanAttributes(
  span: Span,
  attributes: DynamicEventAttributes
): void {
  span.setAttributes(toSpanAttributes(attributes));
}

export function annotateActiveSpan(attributes: DynamicEventAttributes): void {
  const span = trace.getActiveSpan();
  if (!span) {
    return;
  }

  setSpanAttributes(span, attributes);
}
