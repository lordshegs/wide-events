import {
  normalizeEventPrimitive,
  type DynamicEventAttributes,
  type EventPrimitive,
  type FlatEventRow
} from "@wide-events/internal";
import type {
  OtlpAnyValue,
  OtlpExportTraceServiceRequest,
  OtlpKeyValue,
  OtlpSpan
} from "./types.js";

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
  const merged = { ...resourceAttributes, ...spanAttributes };

  const startTime = parseNanoseconds(span.startTimeUnixNano);
  const endTime = parseNanoseconds(span.endTimeUnixNano);

  const durationMs =
    startTime !== null && endTime !== null ? Number(endTime - startTime) / 1_000_000 : null;
  const traceId = requireString(span.traceId, "span.traceId");
  const spanId = requireString(span.spanId, "span.spanId");

  const row: FlatEventRow = {
    trace_id: traceId,
    span_id: spanId,
    parent_span_id: span.parentSpanId?.trim() ? span.parentSpanId : null,
    ts: startTime === null ? new Date(0).toISOString() : new Date(Number(startTime / 1_000_000n)).toISOString(),
    duration_ms: durationMs,
    main:
      typeof merged["main"] === "boolean"
        ? merged["main"]
        : span.kind === 1 && !(span.parentSpanId && span.parentSpanId.length > 0),
    sample_rate: normalizeInteger(merged["sample_rate"], 1),
    "service.name": expectNullableString(merged["service.name"]),
    "service.environment": expectNullableString(merged["service.environment"]),
    "service.version": expectNullableString(merged["service.version"]),
    "http.route": expectNullableString(merged["http.route"]),
    "http.status_code": normalizeNullableInteger(merged["http.status_code"]),
    "http.request.method": expectNullableString(
      merged["http.request.method"] ?? merged["http.method"]
    ),
    error: normalizeNullableBoolean(merged["error"]),
    "exception.slug": expectNullableString(
      merged["exception.slug"] ?? merged["exception.type"]
    ),
    "user.id": expectNullableString(merged["user.id"]),
    "user.type": expectNullableString(merged["user.type"]),
    "user.org.id": expectNullableString(merged["user.org.id"])
  };

  for (const [key, value] of Object.entries(merged)) {
    if (key in row) {
      continue;
    }

    row[key] = typeof value === "string" ? value : JSON.stringify(value);
  }

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

function normalizeAnyValue(value: OtlpAnyValue | undefined): EventPrimitive {
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
    return normalizeEventPrimitive(value.arrayValue.values.map(normalizeAnyValue));
  }

  if (value.kvlistValue?.values) {
    const nested: Record<string, EventPrimitive> = {};
    for (const entry of value.kvlistValue.values) {
      if (!entry.key) {
        continue;
      }

      nested[entry.key] = normalizeAnyValue(entry.value);
    }
    return normalizeEventPrimitive(nested);
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

function expectNullableString(value: EventPrimitive | undefined): string | null {
  if (typeof value === "undefined" || value === null) {
    return null;
  }

  return typeof value === "string" ? value : String(value);
}

function normalizeInteger(value: EventPrimitive | undefined, fallback: number): number {
  const normalized = normalizeNullableInteger(value);
  return normalized ?? fallback;
}

function normalizeNullableInteger(value: EventPrimitive | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeNullableBoolean(value: EventPrimitive | undefined): boolean | null {
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
