export declare const BASELINE_COLUMN_TYPES: {
    readonly trace_id: "VARCHAR";
    readonly span_id: "VARCHAR";
    readonly parent_span_id: "VARCHAR";
    readonly ts: "TIMESTAMPTZ";
    readonly duration_ms: "DOUBLE";
    readonly main: "BOOLEAN";
    readonly sample_rate: "INTEGER";
    readonly "service.name": "VARCHAR";
    readonly "service.environment": "VARCHAR";
    readonly "service.version": "VARCHAR";
    readonly "http.route": "VARCHAR";
    readonly "http.status_code": "INTEGER";
    readonly "http.request.method": "VARCHAR";
    readonly error: "BOOLEAN";
    readonly "exception.slug": "VARCHAR";
    readonly "user.id": "VARCHAR";
    readonly "user.type": "VARCHAR";
    readonly "user.org.id": "VARCHAR";
};
export type BaselineColumnName = keyof typeof BASELINE_COLUMN_TYPES;
export declare const BASELINE_COLUMN_NAMES: readonly string[];
export declare const BASE_TABLE_SQL = "CREATE TABLE IF NOT EXISTS events (\n  trace_id VARCHAR NOT NULL,\n  span_id VARCHAR NOT NULL,\n  parent_span_id VARCHAR,\n  ts TIMESTAMPTZ NOT NULL,\n  duration_ms DOUBLE,\n  main BOOLEAN NOT NULL DEFAULT false,\n  sample_rate INTEGER NOT NULL DEFAULT 1,\n  \"service.name\" VARCHAR,\n  \"service.environment\" VARCHAR,\n  \"service.version\" VARCHAR,\n  \"http.route\" VARCHAR,\n  \"http.status_code\" INTEGER,\n  \"http.request.method\" VARCHAR,\n  error BOOLEAN,\n  \"exception.slug\" VARCHAR,\n  \"user.id\" VARCHAR,\n  \"user.type\" VARCHAR,\n  \"user.org.id\" VARCHAR\n)";
//# sourceMappingURL=schema.d.ts.map