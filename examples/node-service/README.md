# Node Example

Minimal Node HTTP server instrumented with `@wide-events/sdk`.

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

## Typecheck

```bash
pnpm --filter wide-events-example-node-service typecheck
```
