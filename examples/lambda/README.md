# Lambda Example

Minimal AWS Lambda-style handler instrumented with `@wide-events/sdk`.

## Environment

- `WIDE_EVENTS_COLLECTOR_URL`: default `http://localhost:4318`
- `WIDE_EVENTS_ENVIRONMENT`: default `development`
- `WIDE_EVENTS_SERVICE_NAME`: default `example-lambda`

## What it exports

`src/handler.ts` exports:

- `createLambdaExample()` for tests or custom wiring
- `handler` as the default wrapped Lambda handler

The wrapped handler annotates the service-root span, adopts an inbound `traceparent` header when present, records thrown errors, and flushes before returning or rethrowing.

Because Lambda sets `AWS_LAMBDA_FUNCTION_NAME`, `@wide-events/sdk` enables AWS SDK auto-instrumentation by default when `autoInstrument.aws` is omitted. That means DynamoDB and other AWS SDK v3 calls can produce child spans without extra Lambda-specific configuration.

If you want to disable AWS SDK tracing in Lambda, construct the SDK with:

```ts
const wideEvents = new WideEvents({
  serviceName: "example-lambda",
  environment: "development",
  collectorUrl: "http://localhost:4318",
  autoInstrument: {
    aws: false
  }
});
```

## Typecheck

```bash
pnpm --filter wide-events-example-lambda typecheck
```

## Local execution note

This package demonstrates the typed Lambda entrypoint and wrapper behavior. It is not a full SAM or CDK project. The end-to-end test suite invokes the exported handler directly.
