export const BASELINE_COLUMN_TYPES = {
    trace_id: "VARCHAR",
    span_id: "VARCHAR",
    parent_span_id: "VARCHAR",
    ts: "TIMESTAMPTZ",
    duration_ms: "DOUBLE",
    main: "BOOLEAN",
    sample_rate: "INTEGER",
    "service.name": "VARCHAR",
    "service.environment": "VARCHAR",
    "service.version": "VARCHAR",
    "http.route": "VARCHAR",
    "http.status_code": "INTEGER",
    "http.request.method": "VARCHAR",
    error: "BOOLEAN",
    "exception.slug": "VARCHAR",
    "user.id": "VARCHAR",
    "user.type": "VARCHAR",
    "user.org.id": "VARCHAR"
};
export const BASELINE_COLUMN_NAMES = Object.freeze(Object.keys(BASELINE_COLUMN_TYPES));
export const BASE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS events (
  trace_id VARCHAR NOT NULL,
  span_id VARCHAR NOT NULL,
  parent_span_id VARCHAR,
  ts TIMESTAMPTZ NOT NULL,
  duration_ms DOUBLE,
  main BOOLEAN NOT NULL DEFAULT false,
  sample_rate INTEGER NOT NULL DEFAULT 1,
  "service.name" VARCHAR,
  "service.environment" VARCHAR,
  "service.version" VARCHAR,
  "http.route" VARCHAR,
  "http.status_code" INTEGER,
  "http.request.method" VARCHAR,
  error BOOLEAN,
  "exception.slug" VARCHAR,
  "user.id" VARCHAR,
  "user.type" VARCHAR,
  "user.org.id" VARCHAR
)`;
//# sourceMappingURL=schema.js.map