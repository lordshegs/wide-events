import type { SpanExporter } from "@opentelemetry/sdk-trace-node";
import { z } from "zod";

const autoInstrumentSchema = z
  .object({
    http: z.boolean().default(true),
    postgres: z.boolean().default(true),
    redis: z.boolean().default(true),
    fetch: z.boolean().default(true),
    aws: z.boolean().optional()
  })
  .default({
    http: true,
    postgres: true,
    redis: true,
    fetch: true
  });

export const nodeOptionsSchema = z.object({
  serviceName: z.string().min(1),
  environment: z.string().default("development"),
  collectorUrl: z.url(),
  sampleRate: z.number().int().positive().default(1),
  disabled: z.boolean().default(false),
  autoInstrument: autoInstrumentSchema
});

export interface WideEventsOptions extends z.input<typeof nodeOptionsSchema> {
  traceExporter?: SpanExporter;
}

export interface ResolvedWideEventsOptions extends z.output<typeof nodeOptionsSchema> {
  traceExporter?: SpanExporter;
}

export const edgeOptionsSchema = z.object({
  serviceName: z.string().min(1),
  environment: z.string().default("development"),
  collectorUrl: z.url(),
  sampleRate: z.number().int().positive().default(1),
  disabled: z.boolean().default(false)
});

export type EdgeWideEventsOptions = z.input<typeof edgeOptionsSchema>;
export type ResolvedEdgeWideEventsOptions = z.output<typeof edgeOptionsSchema>;

export function resolveNodeOptions(options: WideEventsOptions): ResolvedWideEventsOptions {
  const parsed = nodeOptionsSchema.parse(options);
  const autoInstrument = {
    http: parsed.autoInstrument.http,
    postgres: parsed.autoInstrument.postgres,
    redis: parsed.autoInstrument.redis,
    fetch: parsed.autoInstrument.fetch,
    aws: parsed.autoInstrument.aws ?? isLambdaEnvironment()
  };

  return options.traceExporter
    ? {
        ...parsed,
        autoInstrument,
        traceExporter: options.traceExporter
      }
    : {
        ...parsed,
        autoInstrument
      };
}

function isLambdaEnvironment(): boolean {
  return typeof process.env["AWS_LAMBDA_FUNCTION_NAME"] === "string";
}
