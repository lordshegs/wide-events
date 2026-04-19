import { z } from "zod";
export interface OtlpAnyValue {
    stringValue?: string | undefined;
    boolValue?: boolean | undefined;
    intValue?: string | number | undefined;
    doubleValue?: number | undefined;
    arrayValue?: {
        values?: OtlpAnyValue[] | undefined;
    } | undefined;
    kvlistValue?: {
        values?: OtlpKeyValue[] | undefined;
    } | undefined;
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
export declare const otlpAnyValueSchema: z.ZodType<OtlpAnyValue>;
export declare const otlpKeyValueSchema: z.ZodType<OtlpKeyValue>;
export declare const otlpSpanSchema: z.ZodType<OtlpSpan>;
export declare const otlpScopeSpanSchema: z.ZodType<OtlpScopeSpan>;
export declare const otlpResourceSchema: z.ZodType<OtlpResource>;
export declare const otlpResourceSpanSchema: z.ZodType<OtlpResourceSpan>;
export declare const otlpExportTraceServiceRequestSchema: z.ZodType<OtlpExportTraceServiceRequest>;
//# sourceMappingURL=types.d.ts.map