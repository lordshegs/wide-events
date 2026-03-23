import type { Span } from "@opentelemetry/api";
import type { DynamicEventAttributes } from "@wide-events/internal";
export declare function isSpanLike(value: unknown): value is Span;
export declare function setSpanAttributes(span: Span, attributes: DynamicEventAttributes): void;
//# sourceMappingURL=span.d.ts.map