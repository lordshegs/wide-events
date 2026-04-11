import { z } from "zod";
export const collectorConfigSchema = z.object({
    duckDbPath: z.string().min(1),
    port: z.number().int().positive().default(4318),
    batchSize: z.number().int().positive().default(100),
    batchTimeoutMs: z.number().int().positive().default(1_000),
    retentionDays: z.number().int().positive().default(30),
    maxColumns: z.number().int().positive().default(200),
    queueLimit: z.number().int().positive().default(10_000)
});
export function readCollectorConfig(env = process.env) {
    return collectorConfigSchema.parse({
        duckDbPath: env["WIDE_EVENTS_DUCKDB_PATH"],
        port: parseInteger(env["WIDE_EVENTS_COLLECTOR_PORT"], 4318),
        batchSize: parseInteger(env["WIDE_EVENTS_BATCH_SIZE"], 100),
        batchTimeoutMs: parseInteger(env["WIDE_EVENTS_BATCH_TIMEOUT_MS"], 1_000),
        retentionDays: parseInteger(env["WIDE_EVENTS_RETENTION_DAYS"], 30),
        maxColumns: parseInteger(env["WIDE_EVENTS_MAX_COLUMNS"], 200),
        queueLimit: parseInteger(env["WIDE_EVENTS_QUEUE_LIMIT"], 10_000)
    });
}
function parseInteger(value, fallback) {
    if (!value) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
//# sourceMappingURL=config.js.map