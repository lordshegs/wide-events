import { z } from "zod";
const durationWindowPattern = /^(\d+)(ms|s|m|h|d)$/u;
export const eventPrimitiveSchema = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null()
]);
const countSelectSchema = z
    .object({
    fn: z.literal("COUNT"),
    as: z.string().min(1).optional()
})
    .strict();
const fieldSelectSchema = z
    .object({
    fn: z.enum(["SUM", "AVG", "MIN", "MAX", "P50", "P95", "P99"]),
    field: z.string().min(1),
    as: z.string().min(1).optional()
})
    .strict();
export const querySelectItemSchema = z.union([
    countSelectSchema,
    fieldSelectSchema
]);
const scalarFilterSchema = z
    .object({
    field: z.string().min(1),
    op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]),
    value: eventPrimitiveSchema
})
    .strict();
const inFilterSchema = z
    .object({
    field: z.string().min(1),
    op: z.literal("in"),
    value: z.array(eventPrimitiveSchema).min(1)
})
    .strict();
export const queryFilterSchema = z.union([
    scalarFilterSchema,
    inFilterSchema
]);
export const queryOrderBySchema = z
    .object({
    field: z.string().min(1),
    dir: z.enum(["asc", "desc"])
})
    .strict();
export const queryTimeRangeSchema = z
    .object({
    last: z.string().regex(durationWindowPattern)
})
    .strict();
export const structuredQuerySchema = z
    .object({
    select: z.array(querySelectItemSchema).min(1),
    filters: z.array(queryFilterSchema).optional(),
    groupBy: z.array(z.string().min(1)).optional(),
    timeRange: queryTimeRangeSchema.optional(),
    orderBy: queryOrderBySchema.optional(),
    limit: z.number().int().positive().optional(),
    scope: z.enum(["main", "all"]).optional()
})
    .strict();
export const sqlRequestSchema = z
    .object({
    sql: z.string().min(1)
})
    .strict();
export const traceParamsSchema = z
    .object({
    id: z.string().min(1)
})
    .strict();
//# sourceMappingURL=validation.js.map