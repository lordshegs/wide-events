import { flattenTraceRequest } from "../otlp/flatten.js";
import { otlpExportTraceServiceRequestSchema } from "../otlp/types.js";
export function registerTraceRoutes(app, dependencies) {
    app.post("/v1/traces", async (request, reply) => {
        const body = otlpExportTraceServiceRequestSchema.parse(request.body);
        const rows = flattenTraceRequest(body);
        await dependencies.store.enqueueRows(rows);
        await reply.code(202).send({ accepted: rows.length });
    });
}
//# sourceMappingURL=v1-traces.js.map