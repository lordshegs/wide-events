import { trace } from "@opentelemetry/api";
import { toSpanAttributes } from "../shared/attributes.js";
export function isSpanLike(value) {
    return (typeof value === "object" &&
        value !== null &&
        "setAttributes" in value &&
        typeof value.setAttributes === "function");
}
export function setSpanAttributes(span, attributes) {
    span.setAttributes(toSpanAttributes(attributes));
}
export function annotateActiveSpan(attributes) {
    const span = trace.getActiveSpan();
    if (!span) {
        return;
    }
    setSpanAttributes(span, attributes);
}
//# sourceMappingURL=span.js.map