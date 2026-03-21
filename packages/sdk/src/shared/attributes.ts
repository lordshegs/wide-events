import type { Attributes } from "@opentelemetry/api";
import {
  normalizeEventPrimitive,
  type DynamicEventAttributes,
  type EventPrimitive
} from "@wide-events/internal";

export type AnnotationAttributes = Record<string, EventPrimitive | undefined>;

export function normalizeAttributes(
  attributes: AnnotationAttributes
): DynamicEventAttributes {
  const normalized: DynamicEventAttributes = {};

  for (const [key, value] of Object.entries(attributes)) {
    normalized[key] = normalizeEventPrimitive(value);
  }

  return normalized;
}

export function toSpanAttributes(attributes: DynamicEventAttributes): Attributes {
  const spanAttributes: Attributes = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (value === null) {
      continue;
    }

    spanAttributes[key] = value;
  }

  return spanAttributes;
}

export function toOtlpAttributes(
  attributes: DynamicEventAttributes
): Array<{ key: string; value: Record<string, string | number | boolean> }> {
  return Object.entries(attributes).map(([key, value]) => ({
    key,
    value: toOtlpValue(value)
  }));
}

function toOtlpValue(value: EventPrimitive): Record<string, string | number | boolean> {
  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "boolean") {
    return { boolValue: value };
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { intValue: String(value) }
      : { doubleValue: value };
  }

  return { stringValue: "null" };
}
