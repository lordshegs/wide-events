import { type Span } from "@opentelemetry/api";
import type { DynamicEventAttributes } from "..";
export declare function isSpanLike(value: unknown): value is Span;
export declare function setSpanAttributes(span: Span, attributes: DynamicEventAttributes): void;
export declare function annotateActiveSpan(attributes: DynamicEventAttributes): void;
//# sourceMappingURL=span.d.ts.map