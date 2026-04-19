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
export const edgeOptionsSchema = z.object({
    serviceName: z.string().min(1),
    environment: z.string().default("development"),
    collectorUrl: z.url(),
    sampleRate: z.number().int().positive().default(1),
    disabled: z.boolean().default(false)
});
export function resolveNodeOptions(options) {
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
function isLambdaEnvironment() {
    return typeof process.env["AWS_LAMBDA_FUNCTION_NAME"] === "string";
}
//# sourceMappingURL=options.js.map