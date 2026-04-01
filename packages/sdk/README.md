# @wide-events/sdk

Instrumentation SDK for Node.js services, AWS Lambda handlers, and edge runtimes.

## Install

```bash
npm install @wide-events/sdk
```

## Node API

```ts
import { WideEvents } from "@wide-events/sdk";

const wideEvents = new WideEvents({
  serviceName: "api",
  environment: "production",
  collectorUrl: "http://localhost:4318",
  sampleRate: 1
});
```

### Options

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `serviceName` | `string` | required | Written to `service.name`. |
| `environment` | `string` | `"development"` | Written to `service.environment`. |
| `collectorUrl` | `string` | required | Base URL for the collector. |
| `sampleRate` | `number` | `1` | Head sampling. `1` means export every request. `10` means roughly 1 in 10. |
| `disabled` | `boolean` | `false` | Disables instrumentation and export. |
| `autoInstrument.http` | `boolean` | `true` | Controls HTTP auto-instrumentation. |
| `autoInstrument.postgres` | `boolean` | `true` | Controls Postgres instrumentation. |
| `autoInstrument.redis` | `boolean` | `true` | Controls Redis instrumentation. |
| `autoInstrument.fetch` | `boolean` | `true` | Controls fetch instrumentation in Node. |

### Methods

| Method | Purpose |
| --- | --- |
| `middleware()` | Creates request middleware that establishes the service-root span and request context. |
| `annotate(attributes, options?)` | Adds primitive attributes to the active service-root span. Outside an active context this is a no-op. |
| `forceFlush()` | Flushes pending spans to the collector. |
| `wrapHandler(handler)` | Wraps a Lambda-style handler and guarantees flush in `finally`. |
| `shutdown()` | Releases the process-wide runtime when you are done with it. |

`annotate()` accepts only primitive values: `string`, `number`, `boolean`, or `null`. You can request immediate promotion for selected custom attributes with `options.promote`.

### Express-style or raw HTTP usage

```ts
import { createServer } from "node:http";
import { WideEvents } from "@wide-events/sdk";

const wideEvents = new WideEvents({
  serviceName: "api",
  environment: "production",
  collectorUrl: "http://localhost:4318"
});

const middleware = wideEvents.middleware();

const server = createServer((request, response) => {
  middleware(
    {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [
          key,
          Array.isArray(value) ? value : value ?? undefined
        ])
      )
    },
    response,
    () => {
      wideEvents.annotate({
        main: true,
        "http.route": request.url ?? "/"
      });
      wideEvents.annotate(
        {
          "tenant.plan": "pro"
        },
        { promote: ["tenant.plan"] }
      );
      response.statusCode = 200;
      response.end("ok");
    }
  );
});
```

### `main=true` semantics

The SDK treats the service-root span as the primary wide-event row. `annotate()` writes onto that span, not onto whichever child span happens to be active. The collector still stores all spans, but structured queries default to `main=true`.

Promotion hints are internal storage metadata. They are sent to the collector so it can create promoted columns eagerly, but they are not exposed as user-visible event attributes.

### Sampling

Sampling is head-based only in v0.1. When a request is sampled in, the SDK writes `sample_rate` to the exported span. When a request is sampled out, the request is skipped entirely instead of exporting a partial trace.

### Node runtime singleton

The Node SDK enforces a single active runtime per process:

- If you construct multiple `WideEvents` instances with identical resolved options, they reuse the same runtime.
- If you construct a second instance with different options, the constructor throws.

This avoids duplicate OpenTelemetry registration and duplicate exports from the same process.

## Lambda usage

```ts
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context
} from "aws-lambda";
import { WideEvents } from "@wide-events/sdk";

const wideEvents = new WideEvents({
  serviceName: "api-lambda",
  environment: "production",
  collectorUrl: "http://localhost:4318"
});

export const handler = wideEvents.wrapHandler<
  APIGatewayProxyEventV2,
  Context,
  APIGatewayProxyStructuredResultV2
>((event) => {
  wideEvents.annotate({
    main: true,
    "http.request.method": event.requestContext.http.method,
    "http.route": event.rawPath || "/"
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true })
  };
});
```

`wrapHandler()` creates a server span, adopts an upstream `traceparent` header when present, marks the invocation as `main=true`, records thrown errors, and flushes in `finally` before returning or rethrowing.

## Edge API

Import edge builds from `@wide-events/sdk/edge`.

```ts
import { WideEvents } from "@wide-events/sdk/edge";

const wideEvents = new WideEvents({
  serviceName: "edge-gateway",
  environment: "production",
  collectorUrl: "http://localhost:4318"
});
```

### Edge methods

| Method | Purpose |
| --- | --- |
| `annotate(attributes, options?)` | Adds primitive attributes to the span being built and can request eager promotion for selected custom attributes. |
| `setParentContext(traceparent)` | Adopts an inbound `traceparent` when valid. Invalid values are ignored. |
| `getTraceparent()` | Returns a `traceparent` for propagating outbound work. |
| `flush(fetchImpl?)` | Sends the span to the collector. Safe to call more than once. |

### Worker usage

```ts
import { WideEvents } from "@wide-events/sdk/edge";

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response {
    const wideEvents = new WideEvents({
      serviceName: env.WIDE_EVENTS_SERVICE_NAME,
      environment: env.WIDE_EVENTS_ENVIRONMENT ?? "development",
      collectorUrl: env.WIDE_EVENTS_COLLECTOR_URL
    });

    wideEvents.annotate({
      main: true,
      "http.route": new URL(request.url).pathname,
      "http.request.method": request.method
    });
    wideEvents.annotate(
      {
        "tenant.plan": "pro"
      },
      { promote: ["tenant.plan"] }
    );

    ctx.waitUntil(wideEvents.flush());
    return new Response("ok");
  }
};
```

Edge runtimes do not auto-instrument. You are responsible for propagating `traceparent` and for calling `flush()`, usually with `waitUntil()`.

Promotion is forward-only. The collector promotes the first hinted occurrence and writes future rows into the promoted column, but it does not backfill historical rows synchronously.
