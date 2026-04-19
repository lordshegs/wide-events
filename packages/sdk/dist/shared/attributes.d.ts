import type { Attributes } from "@opentelemetry/api";
import { type DynamicEventAttributes, type EventPrimitive } from "..";
export type AnnotationAttributes = Record<string, EventPrimitive | undefined>;
export type AnnotationKey<T extends AnnotationAttributes> = Extract<keyof T, string>;
export interface AnnotateOptions<T extends AnnotationAttributes> {
    promote?: readonly AnnotationKey<T>[];
}
export declare function normalizeAttributes(attributes: AnnotationAttributes): DynamicEventAttributes;
export declare function buildAnnotatedAttributes<T extends AnnotationAttributes>(attributes: T, options?: AnnotateOptions<T>): DynamicEventAttributes;
export declare function toSpanAttributes(attributes: DynamicEventAttributes): Attributes;
export declare function toOtlpAttributes(attributes: DynamicEventAttributes): Array<{
    key: string;
    value: Record<string, unknown>;
}>;
//# sourceMappingURL=attributes.d.ts.map