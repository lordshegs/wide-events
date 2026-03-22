# Worker Example

Minimal Cloudflare Worker-style handler instrumented with `@wide-events/sdk/edge`.

## Environment

- `WIDE_EVENTS_COLLECTOR_URL`: required in real deployments
- `WIDE_EVENTS_ENVIRONMENT`: default `development`
- `WIDE_EVENTS_SERVICE_NAME`: required in real deployments

## What it exports

`src/worker.ts` exports:

- `handleWorkerRequest(request, env, executionContext)`
- default `{ fetch }` for Worker-style integration

The handler reads an inbound `traceparent` when present, annotates the request span, and schedules export with `executionContext.waitUntil(wideEvents.flush())`.

## Typecheck

```bash
pnpm --filter wide-events-example-worker typecheck
```

## Local execution note

This package is a typed example module, not a complete Wrangler application. Use it as the handler body inside a real Worker project that provides bindings and `ExecutionContext`.
