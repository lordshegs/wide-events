import { traceParamsSchema } from "../index.js";
export function registerTraceQueryRoutes(app, dependencies) {
    app.get("/trace/:id", async (request) => {
        const params = traceParamsSchema.parse(request.params);
        const rows = await dependencies.database.executeRead(`SELECT * FROM events WHERE trace_id = ? ORDER BY ts ASC`, [params.id]);
        return {
            traceId: params.id,
            rows
        };
    });
}
//# sourceMappingURL=trace.js.map