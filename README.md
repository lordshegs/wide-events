# wide-events

Self-hosted observability for wide-event style analysis on DuckDB.

`wide-events` stores one row per span, but treats `main=true` service-root spans as the primary rows for product-style queries. The collector accepts OTLP over HTTP JSON, writes into DuckDB, and exposes a small query API for dashboards, scripts, notebooks, and trace drill-down. Dynamic attributes land in `attributes_overflow` first and can later be promoted into typed DuckDB columns by the collector.

## Packages

| Package                  | Role                                                               |
| ------------------------ | ------------------------------------------------------------------ |
| `@wide-events/sdk`       | Node and edge instrumentation that exports spans to the collector. |
| `@wide-events/client`    | Typed HTTP client for querying the collector.                      |
| `@wide-events/collector` | Collector server, query API, and CLI entrypoint.                   |

Package-specific docs:

- [packages/sdk/README.md](packages/sdk/README.md)
- [packages/client/README.md](packages/client/README.md)
- [packages/collector/README.md](packages/collector/README.md)

## Quick Start

1. Start a collector.
2. Point the SDK at the collector URL.
3. Query the collector with the client or raw HTTP.

### Run the collector from a git checkout

Requirements:

- [Node.js](https://nodejs.org/) 22 or newer
- [pnpm](https://pnpm.io/installation)

```bash
git clone https://github.com/aboluwade-oluwasegun/wide-events.git
cd wide-events
corepack enable
pnpm install
pnpm build
mkdir -p .data
WIDE_EVENTS_DUCKDB_PATH=./.data/wide-events.db pnpm --filter @wide-events/collector exec node dist/cli.js
```

The collector listens on `http://localhost:4318` by default.

### Run the collector from npm

```bash
WIDE_EVENTS_DUCKDB_PATH=./wide-events.db npx wide-events-collector
```

### Run the collector with Docker

The Docker workflow publishes to `docker.io/oluwasegun7/wide-events-collector`.

```bash
docker pull oluwasegun7/wide-events-collector:0.1.0

docker run --rm \
  -e WIDE_EVENTS_DUCKDB_PATH=/data/wide-events.db \
  -v "$(pwd)/wide-events-data:/data" \
  -p 4318:4318 \
  oluwasegun7/wide-events-collector:0.1.0
```

For single-host deployment guidance, backups, and upgrades, see [docs/collector-operations.md](docs/collector-operations.md).

## Instrument an application

### Node

```bash
npm install @wide-events/sdk
```

```ts
import { WideEvents } from "@wide-events/sdk";

const wideEvents = new WideEvents({
  serviceName: "api",
  environment: "production",
  collectorUrl: "http://localhost:4318",
});
```

`annotate()` writes onto the active service-root span. Outside an active request or invocation it is a no-op.

Node services can opt in to AWS SDK tracing with `autoInstrument.aws: true`. Lambda enables that AWS SDK instrumentation by default when `AWS_LAMBDA_FUNCTION_NAME` is present unless you explicitly disable it.

### Edge and Workers

```ts
import { WideEvents } from "@wide-events/sdk/edge";

const wideEvents = new WideEvents({
  serviceName: "edge-gateway",
  environment: "production",
  collectorUrl: "http://localhost:4318",
});
```

Edge runtimes must call `flush()` themselves, typically with `ctx.waitUntil(wideEvents.flush())`.

### Query the collector

```bash
npm install @wide-events/client
```

```ts
import { WideEventsClient } from "@wide-events/client";

const client = new WideEventsClient({ url: "http://localhost:4318" });

const result = await client.query({
  select: [{ fn: "COUNT", as: "requests" }],
  filters: [{ field: "service.name", op: "eq", value: "api" }],
});
```

Structured queries default to `scope: "main"`, which means the collector injects `main = true` unless you explicitly set `scope: "all"`. Structured queries target baseline and promoted columns; overflow-only keys remain available through `/sql` and trace inspection.

When you analyze DynamoDB or other AWS SDK spans, use `scope: "all"` because those are child spans rather than `main=true` root rows. A common pattern is labeling the active AWS span with an app-level attribute such as `dynamodb.query_name = "listCustomerOrders"`.

## Collector Configuration

Required:

- `WIDE_EVENTS_DUCKDB_PATH`: path to the DuckDB file

Optional:

- `WIDE_EVENTS_COLLECTOR_PORT`: default `4318`
- `WIDE_EVENTS_BATCH_SIZE`: default `100`
- `WIDE_EVENTS_BATCH_TIMEOUT_MS`: default `1000`
- `WIDE_EVENTS_RETENTION_DAYS`: default `30`
- `WIDE_EVENTS_MAX_PROMOTED_COLUMNS`: default `200`
- `WIDE_EVENTS_PROMOTION_INTERVAL_MS`: default `300000`
- `WIDE_EVENTS_PROMOTION_MIN_ROWS`: default `1000`
- `WIDE_EVENTS_PROMOTION_MIN_RATIO`: default `0.01`
- `WIDE_EVENTS_PROMOTION_MAX_KEYS_PER_RUN`: default `1`
- `WIDE_EVENTS_QUEUE_LIMIT`: default `10000`

## Examples

- [examples/node-service/README.md](examples/node-service/README.md)
- [examples/lambda/README.md](examples/lambda/README.md)
- [examples/worker/README.md](examples/worker/README.md)

## Operational Notes

- The collector stores all spans, not only `main=true` rows. Trace reconstruction uses all rows for a `trace_id`.
- Structured queries default to `main=true` semantics and expose baseline plus promoted fields. Use `scope: "all"` when you want all spans.
- Overflow-only keys stay queryable through `/sql`, for example with `map_extract_value(attributes_overflow, 'feature.flag')`.
- `/sql` is intentionally read-only in v0.1.
- The collector has no built-in auth in v0.1. Keep it behind a trusted network boundary.
