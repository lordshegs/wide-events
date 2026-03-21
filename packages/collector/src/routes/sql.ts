import type { FastifyInstance } from "fastify";
import { assertRecord } from "@wide-events/internal";
import { assertReadOnlySql } from "../query/build-query.js";
import type { CollectorDependencies } from "../server.js";

export function registerSqlRoutes(
  app: FastifyInstance,
  dependencies: CollectorDependencies
): void {
  app.post("/sql", async (request) => {
    assertRecord(request.body, "SQL query request");
    const sql = request.body["sql"];
    if (typeof sql !== "string") {
      throw new Error("SQL request must include a sql string");
    }

    assertReadOnlySql(sql);
    const rows = await dependencies.database.executeRead(sql);
    return { rows };
  });
}
