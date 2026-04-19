import type { SpanExporter } from "@opentelemetry/sdk-trace-node";
import { z } from "zod";
export declare const nodeOptionsSchema: z.ZodObject<{
    serviceName: z.ZodString;
    environment: z.ZodDefault<z.ZodString>;
    collectorUrl: z.ZodURL;
    sampleRate: z.ZodDefault<z.ZodNumber>;
    disabled: z.ZodDefault<z.ZodBoolean>;
    autoInstrument: z.ZodDefault<z.ZodObject<{
        http: z.ZodDefault<z.ZodBoolean>;
        postgres: z.ZodDefault<z.ZodBoolean>;
        redis: z.ZodDefault<z.ZodBoolean>;
        fetch: z.ZodDefault<z.ZodBoolean>;
        aws: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export interface WideEventsOptions extends z.input<typeof nodeOptionsSchema> {
    traceExporter?: SpanExporter;
}
export interface ResolvedWideEventsOptions extends z.output<typeof nodeOptionsSchema> {
    traceExporter?: SpanExporter;
}
export declare const edgeOptionsSchema: z.ZodObject<{
    serviceName: z.ZodString;
    environment: z.ZodDefault<z.ZodString>;
    collectorUrl: z.ZodURL;
    sampleRate: z.ZodDefault<z.ZodNumber>;
    disabled: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type EdgeWideEventsOptions = z.input<typeof edgeOptionsSchema>;
export type ResolvedEdgeWideEventsOptions = z.output<typeof edgeOptionsSchema>;
export declare function resolveNodeOptions(options: WideEventsOptions): ResolvedWideEventsOptions;
//# sourceMappingURL=options.d.ts.map