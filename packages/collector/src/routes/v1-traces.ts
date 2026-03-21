import type { FastifyInstance } from "fastify";
import { assertRecord } from "@wide-events/internal";
import { flattenTraceRequest } from "../otlp/flatten.js";
import type { CollectorDependencies } from "../server.js";

export function registerTraceRoutes(
  app: FastifyInstance,
  dependencies: CollectorDependencies
): void {
  app.post("/v1/traces", async (request, reply) => {
    assertRecord(request.body, "OTLP request body");
    const rows = flattenTraceRequest(request.body);
    await dependencies.store.enqueueRows(rows);
    await reply.code(202).send({ accepted: rows.length });
  });
}
