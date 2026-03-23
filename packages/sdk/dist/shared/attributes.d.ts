import type { Attributes } from "@opentelemetry/api";
import { type DynamicEventAttributes, type EventPrimitive } from "@wide-events/internal";
export type AnnotationAttributes = Record<string, EventPrimitive | undefined>;
export declare function normalizeAttributes(attributes: AnnotationAttributes): DynamicEventAttributes;
export declare function toSpanAttributes(attributes: DynamicEventAttributes): Attributes;
export declare function toOtlpAttributes(attributes: DynamicEventAttributes): Array<{
    key: string;
    value: Record<string, string | number | boolean>;
}>;
//# sourceMappingURL=attributes.d.ts.map