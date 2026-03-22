import type { FastifyInstance } from "fastify";
import { structuredQuerySchema } from "@wide-events/internal";
import { BadRequestError } from "../errors.js";
import { compileStructuredQuery } from "../query/build-query.js";
import type { CollectorDependencies } from "../server.js";

export function registerQueryRoutes(
  app: FastifyInstance,
  dependencies: CollectorDependencies
): void {
  app.post("/query", async (request) => {
    const query = structuredQuerySchema.parse(request.body);
    const compiled = compileStructuredQuery(query);
    let rows;
    try {
      rows = await dependencies.database.executeRead(compiled.sql, compiled.params);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestError(error.message);
      }
      throw error;
    }
    return { rows };
  });
}
