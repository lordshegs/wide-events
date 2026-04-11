import { z } from "zod";
export declare const collectorConfigSchema: z.ZodObject<{
    duckDbPath: z.ZodString;
    port: z.ZodDefault<z.ZodNumber>;
    batchSize: z.ZodDefault<z.ZodNumber>;
    batchTimeoutMs: z.ZodDefault<z.ZodNumber>;
    retentionDays: z.ZodDefault<z.ZodNumber>;
    maxColumns: z.ZodDefault<z.ZodNumber>;
    queueLimit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type CollectorConfig = z.infer<typeof collectorConfigSchema>;
export declare function readCollectorConfig(env?: NodeJS.ProcessEnv): CollectorConfig;
//# sourceMappingURL=config.d.ts.map