import type { FastifyInstance } from "fastify";
import { flattenTraceRequest } from "../otlp/flatten";
import { otlpExportTraceServiceRequestSchema } from "../otlp/types";
import type { CollectorDependencies } from "../server";

export function registerTraceRoutes(
  app: FastifyInstance,
  dependencies: CollectorDependencies
): void {
  app.post("/v1/traces", async (request, reply) => {
    const body = otlpExportTraceServiceRequestSchema.parse(request.body);
    const rows = flattenTraceRequest(body);
    await dependencies.store.enqueueRows(rows);
    await reply.code(202).send({ accepted: rows.length });
  });
}
