import Fastify, { type FastifyInstance } from "fastify";
import type { CollectorConfig } from "./config.js";
import { readCollectorConfig } from "./config.js";
import { registerColumnRoutes } from "./routes/columns.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerQueryRoutes } from "./routes/query.js";
import { registerSqlRoutes } from "./routes/sql.js";
import { registerTraceQueryRoutes } from "./routes/trace.js";
import { registerTraceRoutes } from "./routes/v1-traces.js";
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

export async function createCollectorServer(
  config: CollectorConfig = readCollectorConfig()
): Promise<CollectorServer> {
  const database = await DuckDbDatabase.create(config.duckDbPath);
  const schema = new SchemaRegistry(config.maxColumns);
  await schema.hydrate(database);
  const store = new CollectorStore(database, schema, config);
  const retentionJob = new RetentionJob(store);
  const dependencies: CollectorDependencies = {
    config,
    database,
    schema,
    store,
    retentionJob
  };

  const app = Fastify({
    logger: true
  });

  registerHealthRoute(app);
  registerTraceRoutes(app, dependencies);
  registerQueryRoutes(app, dependencies);
  registerSqlRoutes(app, dependencies);
  registerColumnRoutes(app, dependencies);
  registerTraceQueryRoutes(app, dependencies);

  app.setErrorHandler((error, _request, reply) => {
    app.log.error({ err: error }, "collector request failed");
    const message = error instanceof Error ? error.message : String(error);
    void reply.code(400).send({
      error: message
    });
  });

  return {
    app,
    dependencies,
    async start() {
      retentionJob.start();
      await app.listen({
        port: config.port,
        host: "0.0.0.0"
      });
    },
    async close() {
      retentionJob.stop();
      await store.flush();
      await app.close();
      database.close();
    }
  };
}
