# @wide-events/client

Typed HTTP client for the Wide Events collector query APIs.

## Install

```bash
npm install @wide-events/client
```

## Usage

```ts
import { WideEventsClient } from "@wide-events/client";

const client = new WideEventsClient({ url: "http://localhost:4318" });
const columns = await client.getColumns();
```
