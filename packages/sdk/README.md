# @wide-events/sdk

Instrumentation SDK for Node.js and edge runtimes.

## Install

```bash
npm install @wide-events/sdk
```

## Node usage

```ts
import { WideEvents } from "@wide-events/sdk";

const wideEvents = new WideEvents({
  serviceName: "api",
  environment: "production",
  collectorUrl: "http://localhost:4318"
});
```

## Edge usage

```ts
import { WideEvents } from "@wide-events/sdk/edge";
```
