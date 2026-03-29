import type { Attributes } from "@opentelemetry/api";
import {
  normalizeEventPrimitive,
  type DynamicEventAttributes,
  type EventPrimitive,
  type EventValue
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

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      spanAttributes[key] = value;
    }
  }

  return spanAttributes;
}

export function toOtlpAttributes(
  attributes: DynamicEventAttributes
): Array<{ key: string; value: Record<string, unknown> }> {
  return Object.entries(attributes).map(([key, value]) => ({
    key,
    value: toOtlpValue(value)
  }));
}

function toOtlpValue(value: EventValue): Record<string, unknown> {
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

  if (value === null) {
    return { stringValue: "null" };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((entry) => toOtlpValue(entry))
      }
    };
  }

  return {
    kvlistValue: {
      values: Object.entries(value).map(([key, entry]) => ({
        key,
        value: toOtlpValue(entry)
      }))
    }
  };
}
