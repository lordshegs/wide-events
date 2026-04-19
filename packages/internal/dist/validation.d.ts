import { z } from "zod";
export declare const eventPrimitiveSchema: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>;
export declare const querySelectItemSchema: z.ZodUnion<readonly [z.ZodObject<{
    fn: z.ZodLiteral<"COUNT">;
    as: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    fn: z.ZodEnum<{
        SUM: "SUM";
        AVG: "AVG";
        MIN: "MIN";
        MAX: "MAX";
        P50: "P50";
        P95: "P95";
        P99: "P99";
    }>;
    field: z.ZodString;
    as: z.ZodOptional<z.ZodString>;
}, z.core.$strict>]>;
export declare const queryFilterSchema: z.ZodUnion<readonly [z.ZodObject<{
    field: z.ZodString;
    op: z.ZodEnum<{
        eq: "eq";
        neq: "neq";
        gt: "gt";
        gte: "gte";
        lt: "lt";
        lte: "lte";
    }>;
    value: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>;
}, z.core.$strict>, z.ZodObject<{
    field: z.ZodString;
    op: z.ZodLiteral<"in">;
    value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>;
}, z.core.$strict>]>;
export declare const queryOrderBySchema: z.ZodObject<{
    field: z.ZodString;
    dir: z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>;
}, z.core.$strict>;
export declare const queryTimeRangeSchema: z.ZodObject<{
    last: z.ZodString;
}, z.core.$strict>;
export declare const structuredQuerySchema: z.ZodObject<{
    select: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        fn: z.ZodLiteral<"COUNT">;
        as: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        fn: z.ZodEnum<{
            SUM: "SUM";
            AVG: "AVG";
            MIN: "MIN";
            MAX: "MAX";
            P50: "P50";
            P95: "P95";
            P99: "P99";
        }>;
        field: z.ZodString;
        as: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>]>>;
    filters: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        field: z.ZodString;
        op: z.ZodEnum<{
            eq: "eq";
            neq: "neq";
            gt: "gt";
            gte: "gte";
            lt: "lt";
            lte: "lte";
        }>;
        value: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>;
    }, z.core.$strict>, z.ZodObject<{
        field: z.ZodString;
        op: z.ZodLiteral<"in">;
        value: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>;
    }, z.core.$strict>]>>>;
    groupBy: z.ZodOptional<z.ZodArray<z.ZodString>>;
    timeRange: z.ZodOptional<z.ZodObject<{
        last: z.ZodString;
    }, z.core.$strict>>;
    orderBy: z.ZodOptional<z.ZodObject<{
        field: z.ZodString;
        dir: z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>;
    }, z.core.$strict>>;
    limit: z.ZodOptional<z.ZodNumber>;
    scope: z.ZodOptional<z.ZodEnum<{
        main: "main";
        all: "all";
    }>>;
}, z.core.$strict>;
export declare const sqlRequestSchema: z.ZodObject<{
    sql: z.ZodString;
}, z.core.$strict>;
export declare const traceParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strict>;
//# sourceMappingURL=validation.d.ts.map