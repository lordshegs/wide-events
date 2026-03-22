import { z } from "zod";

const nanosecondsPattern = /^\d+$/u;
const integerPattern = /^-?\d+$/u;

export interface OtlpAnyValue {
  stringValue?: string | undefined;
  boolValue?: boolean | undefined;
  intValue?: string | number | undefined;
  doubleValue?: number | undefined;
  arrayValue?:
    | {
        values?: OtlpAnyValue[] | undefined;
      }
    | undefined;
  kvlistValue?:
    | {
        values?: OtlpKeyValue[] | undefined;
      }
    | undefined;
}

export interface OtlpKeyValue {
  key?: string | undefined;
  value?: OtlpAnyValue | undefined;
}

export interface OtlpSpan {
  traceId: string;
  spanId: string;
  kind?: number | undefined;
  parentSpanId?: string | undefined;
  name?: string | undefined;
  startTimeUnixNano?: string | undefined;
  endTimeUnixNano?: string | undefined;
  attributes?: OtlpKeyValue[] | undefined;
}

export interface OtlpScopeSpan {
  spans?: OtlpSpan[] | undefined;
}

export interface OtlpResource {
  attributes?: OtlpKeyValue[] | undefined;
}

export interface OtlpResourceSpan {
  resource?: OtlpResource | undefined;
  scopeSpans?: OtlpScopeSpan[] | undefined;
}

export interface OtlpExportTraceServiceRequest {
  resourceSpans?: OtlpResourceSpan[] | undefined;
}

export const otlpAnyValueSchema: z.ZodType<OtlpAnyValue> = z.lazy(() =>
  z
    .object({
      stringValue: z.string().optional(),
      boolValue: z.boolean().optional(),
      intValue: z.union([z.string().regex(integerPattern), z.number().int()]).optional(),
      doubleValue: z.number().optional(),
      arrayValue: z
        .object({
          values: z.array(otlpAnyValueSchema).optional()
        })
        .loose()
        .optional(),
      kvlistValue: z
        .object({
          values: z.array(otlpKeyValueSchema).optional()
        })
        .loose()
        .optional()
    })
    .loose()
);

export const otlpKeyValueSchema: z.ZodType<OtlpKeyValue> = z
  .object({
    key: z.string().min(1).regex(/^[A-Za-z0-9._-]+$/u).optional(),
    value: otlpAnyValueSchema.optional()
  })
  .loose();

export const otlpSpanSchema: z.ZodType<OtlpSpan> = z
  .object({
    traceId: z.string().min(1),
    spanId: z.string().min(1),
    kind: z.number().int().optional(),
    parentSpanId: z.string().min(1).optional(),
    name: z.string().optional(),
    startTimeUnixNano: z.string().regex(nanosecondsPattern).optional(),
    endTimeUnixNano: z.string().regex(nanosecondsPattern).optional(),
    attributes: z.array(otlpKeyValueSchema).optional()
  })
  .loose();

export const otlpScopeSpanSchema: z.ZodType<OtlpScopeSpan> = z
  .object({
    spans: z.array(otlpSpanSchema).optional()
  })
  .loose();

export const otlpResourceSchema: z.ZodType<OtlpResource> = z
  .object({
    attributes: z.array(otlpKeyValueSchema).optional()
  })
  .loose();

export const otlpResourceSpanSchema: z.ZodType<OtlpResourceSpan> = z
  .object({
    resource: otlpResourceSchema.optional(),
    scopeSpans: z.array(otlpScopeSpanSchema).optional()
  })
  .loose();

export const otlpExportTraceServiceRequestSchema: z.ZodType<OtlpExportTraceServiceRequest> = z
  .object({
    resourceSpans: z.array(otlpResourceSpanSchema).optional()
  })
  .loose();
