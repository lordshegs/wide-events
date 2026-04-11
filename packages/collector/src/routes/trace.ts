import type { FastifyInstance } from "fastify";
import { traceParamsSchema } from "@wide-events/internal";
import type { CollectorDependencies } from "../server";

export function registerTraceQueryRoutes(
  app: FastifyInstance,
  dependencies: CollectorDependencies
): void {
  app.get("/trace/:id", async (request) => {
    const params = traceParamsSchema.parse(request.params);
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
