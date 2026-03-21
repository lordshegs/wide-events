export type EventPrimitive = string | number | boolean | null;
export type DynamicEventAttributes = Record<string, EventPrimitive>;
export interface FlatEventRow extends DynamicEventAttributes {
    trace_id: string;
    span_id: string;
    parent_span_id: string | null;
    ts: string;
    duration_ms: number | null;
    main: boolean;
    sample_rate: number;
    "service.name": string | null;
    "service.environment": string | null;
    "service.version": string | null;
    "http.route": string | null;
    "http.status_code": number | null;
    "http.request.method": string | null;
    error: boolean | null;
    "exception.slug": string | null;
    "user.id": string | null;
    "user.type": string | null;
    "user.org.id": string | null;
}
export type QueryAggregateFunction = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX" | "P50" | "P95" | "P99";
export interface QuerySelectItem {
    fn: QueryAggregateFunction;
    field?: string;
    as?: string;
}
export type QueryFilterOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";
export interface QueryFilter {
    field: string;
    op: QueryFilterOperator;
    value: EventPrimitive | readonly EventPrimitive[];
}
export interface QueryTimeRange {
    last: string;
}
export interface QueryOrderBy {
    field: string;
    dir: "asc" | "desc";
}
export interface StructuredQuery {
    select: readonly QuerySelectItem[];
    filters?: readonly QueryFilter[];
    groupBy?: readonly string[];
    timeRange?: QueryTimeRange;
    orderBy?: QueryOrderBy;
    limit?: number;
}
export type QueryRow = Record<string, EventPrimitive>;
export interface QueryResult {
    rows: QueryRow[];
}
export type ColumnOrigin = "baseline" | "dynamic";
export interface ColumnInfo {
    name: string;
    type: string;
    origin: ColumnOrigin;
}
export interface TraceResult {
    traceId: string;
    rows: QueryRow[];
}
//# sourceMappingURL=types.d.ts.map