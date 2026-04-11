# @wide-events/collector

Collector service and CLI for ingesting OTLP traces and querying DuckDB-backed wide events.

## Install

```bash
npm install @wide-events/collector
```

## Run

```bash
WIDE_EVENTS_DUCKDB_PATH=./wide-events.db npx wide-events-collector
```

The collector listens on `http://localhost:4318` by default.

## Environment

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `WIDE_EVENTS_DUCKDB_PATH` | yes | none | Path to the DuckDB database file. |
| `WIDE_EVENTS_COLLECTOR_PORT` | no | `4318` | HTTP listen port. |
| `WIDE_EVENTS_BATCH_SIZE` | no | `100` | Max rows per write batch. |
| `WIDE_EVENTS_BATCH_TIMEOUT_MS` | no | `1000` | Flush interval for partial batches. |
| `WIDE_EVENTS_RETENTION_DAYS` | no | `30` | Retention cutoff in days. |
| `WIDE_EVENTS_MAX_PROMOTED_COLUMNS` | no | `200` | Maximum number of promoted dynamic columns. |
| `WIDE_EVENTS_PROMOTION_INTERVAL_MS` | no | `300000` | How often the promotion scheduler evaluates candidates. |
| `WIDE_EVENTS_PROMOTION_MIN_ROWS` | no | `1000` | Minimum non-null rows before a key can be promoted. |
| `WIDE_EVENTS_PROMOTION_MIN_RATIO` | no | `0.01` | Minimum retained-row ratio before a key can be promoted. |
| `WIDE_EVENTS_PROMOTION_MAX_KEYS_PER_RUN` | no | `1` | Maximum keys promoted in one scheduler cycle. |
| `WIDE_EVENTS_QUEUE_LIMIT` | no | `10000` | Maximum number of queued rows before ingest is rejected. |

## HTTP API

### `GET /health`

Returns a simple health payload for container orchestration and smoke checks.

### `POST /v1/traces`

Accepts OTLP over HTTP JSON. v0.1 does not support OTLP protobuf or gRPC.

The collector stores one row per span:

- resource attributes
- span attributes
- timing fields
- trace linkage fields

If the SDK sends `main=true`, the collector trusts that value. If it is missing, the collector only falls back to inferring `main=true` for server-root spans without a parent.

Successful responses keep the existing ingest response shape. Invalid payloads return `400`. Queue saturation returns `503`.

### `POST /query`

Executes the structured query DSL and returns:

```json
{
  "rows": []
}
```

Example:

```json
{
  "select": [
    { "fn": "COUNT", "as": "requests" },
    { "fn": "P95", "field": "duration_ms", "as": "p95_duration_ms" }
  ],
  "filters": [
    { "field": "service.name", "op": "eq", "value": "api" }
  ],
  "groupBy": ["http.route"],
  "orderBy": { "field": "requests", "dir": "desc" },
  "limit": 20
}
```

`scope` defaults to `"main"`. In that mode the collector injects `main = true`. Set `scope: "all"` to query all stored spans. Structured queries only target baseline and promoted columns; overflow-only keys should be queried through `/sql`. If you explicitly filter on `main` while also using `scope: "main"`, the request is rejected with `400`.

### `POST /sql`

Executes raw SQL against DuckDB and returns:

```json
{
  "rows": []
}
```

The SQL surface is read-only in v0.1.

### `GET /columns`

Returns schema metadata:

```json
{
  "columns": [
    { "name": "service.name", "type": "VARCHAR", "origin": "baseline" }
  ]
}
```

Columns now include storage and promotion metadata such as `storageState`, `queryable`, `inferredType`, `promotedType`, `seenRows`, and `lastSeenAt`.

### `GET /trace/:id`

Returns all stored rows for a trace in timestamp order:

```json
{
  "traceId": "abc123",
  "rows": []
}
```

## Storage behavior

- All spans are stored, not only `main=true` rows.
- Structured queries default to `main=true` semantics unless `scope: "all"` is requested.
- New attributes land in `attributes_overflow MAP(VARCHAR, JSON)` first.
- SDKs can attach explicit promotion hints for primitive custom attributes. The collector consumes those hints internally and promotes the key before inserting the first hinted row.
- Stable scalar keys can later be promoted into typed DuckDB columns by the background scheduler.
- Explicit promotion hints are a fast path for eager promotion. The background scheduler still handles unhinted overflow keys.
- Promoted keys are backfilled into their typed column and future ingest becomes column-only for that key.
- Hint metadata is not persisted in `attributes_overflow` and is not queryable as event data.
- Retention deletes old rows on a daily schedule and runs through the same serialized write path as inserts and schema changes.

## Logging

The collector emits warnings and info around the operational edges that matter:

- queue saturation
- promotion failures
- retention start, finish, and failure

## Docker

Build locally from the repository root:

```bash
docker build -f packages/collector/Dockerfile -t wide-events-collector:local .
```

The release workflow publishes to `docker.io/$DOCKERHUB_USERNAME/wide-events-collector`.


## Security posture

The collector has no built-in authentication in v0.1. Keep it behind a trusted network boundary, especially if `/sql` is exposed.
