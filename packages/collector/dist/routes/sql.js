import { sqlRequestSchema } from "../index.js";
import { BadRequestError } from "../errors.js";
import { assertReadOnlySql } from "../query/build-query.js";
export function registerSqlRoutes(app, dependencies) {
    app.post("/sql", async (request) => {
        const { sql } = sqlRequestSchema.parse(request.body);
        assertReadOnlySql(sql);
        let rows;
        try {
            rows = await dependencies.database.executeRead(sql);
        }
        catch (error) {
            if (error instanceof Error) {
                throw new BadRequestError(error.message);
            }
            throw error;
        }
        return { rows };
    });
}
//# sourceMappingURL=sql.js.map