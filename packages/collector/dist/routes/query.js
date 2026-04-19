import { structuredQuerySchema } from "../index.js";
import { BadRequestError } from "../errors.js";
import { compileStructuredQuery } from "../query/build-query.js";
export function registerQueryRoutes(app, dependencies) {
    app.post("/query", async (request) => {
        const query = structuredQuerySchema.parse(request.body);
        validateStructuredQueryFields(query, dependencies);
        const compiled = compileStructuredQuery(query);
        let rows;
        try {
            rows = await dependencies.database.executeRead(compiled.sql, compiled.params);
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
function validateStructuredQueryFields(query, dependencies) {
    const referencedFields = new Set();
    for (const select of query.select) {
        if ("field" in select && select.field) {
            referencedFields.add(select.field);
        }
    }
    for (const filter of query.filters ?? []) {
        referencedFields.add(filter.field);
    }
    for (const field of query.groupBy ?? []) {
        referencedFields.add(field);
    }
    for (const field of referencedFields) {
        if (dependencies.schema.isQueryableColumn(field)) {
            continue;
        }
        const state = dependencies.catalog.getFieldStorageState(field);
        if (state === "overflow_only" || state === "promoting" || state === "failed") {
            throw new BadRequestError(`Field "${field}" is not queryable through /query; inspect /columns or use /sql against attributes_overflow`);
        }
        throw new BadRequestError(`Unknown query field "${field}"`);
    }
}
//# sourceMappingURL=query.js.map