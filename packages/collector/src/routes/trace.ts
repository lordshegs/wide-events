import type { FastifyInstance } from "fastify";
import type { CollectorDependencies } from "../server.js";

export function registerTraceQueryRoutes(
  app: FastifyInstance,
  dependencies: CollectorDependencies
): void {
  app.get("/trace/:id", async (request) => {
    const params = request.params as { id: string };
    const rows = await dependencies.database.executeRead(
      `SELECT * FROM events WHERE trace_id = ? ORDER BY ts ASC`,
      [params.id]
    );
    return {
      traceId: params.id,
      rows
    };
  });
}
