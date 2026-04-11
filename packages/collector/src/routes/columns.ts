import type { FastifyInstance } from "fastify";
import type { CollectorDependencies } from "../server";

export function registerColumnRoutes(
  app: FastifyInstance,
  dependencies: CollectorDependencies
): void {
  app.get("/columns", () => ({
    columns: dependencies.catalog.listColumns(dependencies.schema)
  }));
}
