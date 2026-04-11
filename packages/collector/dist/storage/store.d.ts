import { type FlatEventRow } from "@wide-events/internal";
import type { CollectorConfig } from "../config.js";
import { type CollectorLogger } from "../logger.js";
import type { DuckDbDatabase } from "./database.js";
import type { SchemaRegistry } from "./schema-registry.js";
export declare class CollectorStore {
    private readonly database;
    private readonly schema;
    private readonly config;
    private readonly logger;
    private readonly executor;
    private readonly pending;
    private flushTimer;
    private pendingRowCount;
    constructor(database: DuckDbDatabase, schema: SchemaRegistry, config: CollectorConfig, logger?: CollectorLogger);
    enqueueRows(rows: readonly FlatEventRow[]): Promise<void>;
    flush(): Promise<void>;
    runRetention(now?: Date): Promise<void>;
    private flushSoon;
}
//# sourceMappingURL=store.d.ts.map