import { type FastifyInstance } from "fastify";
import type { CollectorConfig } from "./config.js";
import { DuckDbDatabase } from "./storage/database.js";
import { SchemaRegistry } from "./storage/schema-registry.js";
import { CollectorStore } from "./storage/store.js";
import { RetentionJob } from "./jobs/retention.js";
export interface CollectorDependencies {
    config: CollectorConfig;
    database: DuckDbDatabase;
    schema: SchemaRegistry;
    store: CollectorStore;
    retentionJob: RetentionJob;
}
export interface CollectorServer {
    app: FastifyInstance;
    dependencies: CollectorDependencies;
    start(): Promise<void>;
    close(): Promise<void>;
}
export declare function createCollectorServer(config?: CollectorConfig): Promise<CollectorServer>;
//# sourceMappingURL=server.d.ts.map