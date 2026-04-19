# Node Example

Minimal Node HTTP server instrumented with `@wide-events/sdk`.

The server opts in to AWS SDK tracing with `autoInstrument.aws: true`. The folder also includes [src/dynamodb-query.ts](/Users/proton/wide-events/examples/node-service/src/dynamodb-query.ts), which shows the recommended pattern for housed DynamoDB query functions:

- keep query identity at the application layer with `dynamodb.query_name`
- set that attribute with `wideEvents.annotateActiveSpan(...)` immediately before the AWS SDK call
- let the AWS SDK instrumentation supply the DynamoDB operation span and timing data

## Environment

- `WIDE_EVENTS_COLLECTOR_URL`: default `http://localhost:4318`
- `WIDE_EVENTS_ENVIRONMENT`: default `development`
- `WIDE_EVENTS_SERVICE_NAME`: default `node-service`

## Run

From the repository root:

```bash
WIDE_EVENTS_DUCKDB_PATH=./.data/wide-events.db pnpm --filter @wide-events/collector exec node dist/cli.js
```

In another terminal:

```bash
WIDE_EVENTS_COLLECTOR_URL=http://localhost:4318 pnpm --filter wide-events-example-node-service dev
```

Then send a request:

```bash
curl http://localhost:3000/
```

The example emits a `main=true` service-root span with `http.route` and returns `{"ok":true}`.

If you also use the DynamoDB example function, the process can emit child spans for AWS SDK calls. Those spans can be filtered by `dynamodb.query_name = "listCustomerOrders"` and analyzed with `scope: "all"`.

Until `dynamodb.query_name` is promoted, query it through `/sql`, for example:

```sql
SELECT
  date_trunc('minute', ts) AS minute,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration_ms
FROM events
WHERE "rpc.service" = 'DynamoDB'
  AND map_extract_value(attributes_overflow, 'dynamodb.query_name') = '"listCustomerOrders"'
GROUP BY 1
ORDER BY 1 ASC;
```

## Typecheck

```bash
pnpm --filter wide-events-example-node-service typecheck
```
