import type { FastifyInstance } from "fastify";
import { assertRecord, type StructuredQuery } from "@wide-events/internal";
import { compileStructuredQuery } from "../query/build-query.js";
import type { CollectorDependencies } from "../server.js";

export function registerQueryRoutes(
  app: FastifyInstance,
  dependencies: CollectorDependencies
): void {
  app.post("/query", async (request) => {
    assertRecord(request.body, "Structured query");
    const query = request.body as unknown as StructuredQuery;
    const compiled = compileStructuredQuery(query);
    const rows = await dependencies.database.executeRead(
      compiled.sql,
      compiled.params
    );
    return { rows };
  });
}
