import {
  getPromotionHintKey,
  isPromotionHintAttribute,
  type DynamicEventAttributes,
  type EventValue,
  type FlatEventRow
} from "@wide-events/internal";
import type {
  OtlpAnyValue,
  OtlpExportTraceServiceRequest,
  OtlpKeyValue,
  OtlpSpan
} from "./types";

export function flattenTraceRequest(
  request: OtlpExportTraceServiceRequest
): FlatEventRow[] {
  const rows: FlatEventRow[] = [];

  for (const resourceSpan of request.resourceSpans ?? []) {
    const resourceAttributes = extractAttributes(
      resourceSpan.resource?.attributes ?? []
    );

    for (const scopeSpan of resourceSpan.scopeSpans ?? []) {
      for (const span of scopeSpan.spans ?? []) {
        rows.push(flattenSpan(resourceAttributes, span));
      }
    }
  }

  return rows;
}

export function flattenSpan(
  resourceAttributes: DynamicEventAttributes,
  span: OtlpSpan
): FlatEventRow {
  const spanAttributes = extractAttributes(span.attributes ?? []);
  const startTime = parseNanoseconds(span.startTimeUnixNano);
  const endTime = parseNanoseconds(span.endTimeUnixNano);

  const durationMs =
    startTime !== null && endTime !== null ? Number(endTime - startTime) / 1_000_000 : null;
  const traceId = requireString(span.traceId, "span.traceId");
  const spanId = requireString(span.spanId, "span.spanId");

  const row: FlatEventRow = createBaseRow(span, traceId, spanId, startTime, durationMs);
  const combinedAttributes: DynamicEventAttributes = {
    ...resourceAttributes,
    ...spanAttributes
  };

  for (const [key, value] of Object.entries(combinedAttributes)) {
    if (isPromotionHintAttribute(key, value)) {
      row.promoted_attribute_hints.push(getPromotionHintKey(key));
      continue;
    }

    switch (key) {
      case "main":
        row.main = typeof value === "boolean" ? value : row.main;
        break;
      case "sample_rate":
        row.sample_rate = normalizeInteger(value, row.sample_rate);
        break;
      case "service.name":
        row["service.name"] = expectNullableString(value);
        break;
      case "service.environment":
        row["service.environment"] = expectNullableString(value);
        break;
      case "service.version":
        row["service.version"] = expectNullableString(value);
        break;
      case "http.route":
        row["http.route"] = expectNullableString(value);
        break;
      case "http.status_code":
        row["http.status_code"] = normalizeNullableInteger(value);
        break;
      case "http.request.method":
        row["http.request.method"] = expectNullableString(value);
        break;
      case "http.method":
        if (row["http.request.method"] === null) {
          row["http.request.method"] = expectNullableString(value);
        }
        break;
      case "error":
        row.error = normalizeNullableBoolean(value);
        break;
      case "exception.slug":
        row["exception.slug"] = expectNullableString(value);
        break;
      case "exception.type":
        if (row["exception.slug"] === null) {
          row["exception.slug"] = expectNullableString(value);
        }
        break;
      case "user.id":
        row["user.id"] = expectNullableString(value);
        break;
      case "user.type":
        row["user.type"] = expectNullableString(value);
        break;
      case "user.org.id":
        row["user.org.id"] = expectNullableString(value);
        break;
      default:
        row.attributes_overflow[key] = value;
        break;
    }
  }

  return row;
}

function createBaseRow(
  span: OtlpSpan,
  traceId: string,
  spanId: string,
  startTime: bigint | null,
  durationMs: number | null
): FlatEventRow {
  const row: FlatEventRow = {
    trace_id: traceId,
    span_id: spanId,
    parent_span_id: span.parentSpanId?.trim() ? span.parentSpanId : null,
    ts: startTime === null ? new Date(0).toISOString() : new Date(Number(startTime / 1_000_000n)).toISOString(),
    duration_ms: durationMs,
    main: span.kind === 1 && !(span.parentSpanId && span.parentSpanId.length > 0),
    sample_rate: 1,
    "service.name": null,
    "service.environment": null,
    "service.version": null,
    "http.route": null,
    "http.status_code": null,
    "http.request.method": null,
    error: null,
    "exception.slug": null,
    "user.id": null,
    "user.type": null,
    "user.org.id": null,
    attributes_overflow: {},
    promoted_attribute_hints: []
  };

  return row;
}

function extractAttributes(attributes: readonly OtlpKeyValue[]): DynamicEventAttributes {
  const result: DynamicEventAttributes = {};

  for (const attribute of attributes) {
    if (!attribute.key) {
      continue;
    }

    result[attribute.key] = normalizeAnyValue(attribute.value);
  }

  return result;
}

function normalizeAnyValue(value: OtlpAnyValue | undefined): EventValue {
  if (!value) {
    return null;
  }

  if (typeof value.stringValue === "string") {
    return value.stringValue;
  }

  if (typeof value.boolValue === "boolean") {
    return value.boolValue;
  }

  if (typeof value.doubleValue === "number") {
    return value.doubleValue;
  }

  if (typeof value.intValue === "string") {
    return Number.parseInt(value.intValue, 10);
  }

  if (typeof value.intValue === "number") {
    return Math.trunc(value.intValue);
  }

  if (value.arrayValue?.values) {
    return value.arrayValue.values.map(normalizeAnyValue);
  }

  if (value.kvlistValue?.values) {
    const nested: Record<string, EventValue> = {};
    for (const entry of value.kvlistValue.values) {
      if (!entry.key) {
        continue;
      }

      nested[entry.key] = normalizeAnyValue(entry.value);
    }
    return nested;
  }

  return null;
}

function parseNanoseconds(value: string | undefined): bigint | null {
  if (!value) {
    return null;
  }

  return BigInt(value);
}

function requireString(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`${label} is required`);
  }

  return value;
}

function expectNullableString(value: EventValue | undefined): string | null {
  if (typeof value === "undefined" || value === null) {
    return null;
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

function normalizeInteger(value: EventValue | undefined, fallback: number): number {
  const normalized = normalizeNullableInteger(value);
  return normalized ?? fallback;
}

function normalizeNullableInteger(value: EventValue | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeNullableBoolean(value: EventValue | undefined): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return null;
}
