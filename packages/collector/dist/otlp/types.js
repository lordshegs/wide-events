import { z } from "zod";
const nanosecondsPattern = /^\d+$/u;
const integerPattern = /^-?\d+$/u;
export const otlpAnyValueSchema = z.lazy(() => z
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
    .loose());
export const otlpKeyValueSchema = z
    .object({
    key: z.string().min(1).regex(/^[A-Za-z0-9._-]+$/u).optional(),
    value: otlpAnyValueSchema.optional()
})
    .loose();
export const otlpSpanSchema = z
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
export const otlpScopeSpanSchema = z
    .object({
    spans: z.array(otlpSpanSchema).optional()
})
    .loose();
export const otlpResourceSchema = z
    .object({
    attributes: z.array(otlpKeyValueSchema).optional()
})
    .loose();
export const otlpResourceSpanSchema = z
    .object({
    resource: otlpResourceSchema.optional(),
    scopeSpans: z.array(otlpScopeSpanSchema).optional()
})
    .loose();
export const otlpExportTraceServiceRequestSchema = z
    .object({
    resourceSpans: z.array(otlpResourceSpanSchema).optional()
})
    .loose();
//# sourceMappingURL=types.js.map