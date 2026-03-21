# wide-events

Self-hostable observability for wide-event style trace analysis on DuckDB.

## Choose your path

| Goal | Start here |
|------|------------|
| Send traces or query events from your application | [Use the SDK or client](#use-the-sdk-or-client-in-your-application) |
| Run the collector service yourself | [From a git checkout](#run-the-collector-from-a-git-checkout) or [Docker](#run-the-collector-docker) |

Most setups use **both**: run a collector, then point the SDK (and optionally the client) at its base URL.

---

## Use the SDK or client in your application

**Prerequisite:** A running collector reachable at your chosen URL. Examples below use `http://localhost:4318`. Start one with [Run the collector from a git checkout](#run-the-collector-from-a-git-checkout) or [Docker](#run-the-collector-docker).

### SDK (Node)

```bash
npm install @wide-events/sdk
```

```ts
import { WideEvents } from "@wide-events/sdk";

const wideEvents = new WideEvents({
  serviceName: "api",
  environment: "production",
  collectorUrl: "http://localhost:4318"
});
```

For edge runtimes, import from `@wide-events/sdk/edge`. More detail: [`packages/sdk/README.md`](packages/sdk/README.md).

### Client (query API)

```bash
npm install @wide-events/client
```

```ts
import { WideEventsClient } from "@wide-events/client";

const client = new WideEventsClient({ url: "http://localhost:4318" });
const columns = await client.getColumns();
```

More detail: [`packages/client/README.md`](packages/client/README.md).

---

## Run the collector from a git checkout

Use this to run the collector from source (latest repo state, or a specific branch/tag).

**Requirements**

- [Node.js](https://nodejs.org/) **22** or newer (aligned with the published Docker image).
- [pnpm](https://pnpm.io/installation). This repo declares a `packageManager` field; with Node 16.13+, run `corepack enable` so the correct pnpm version is used automatically.

**Steps**

```bash
git clone https://github.com/aboluwade-oluwasegun/wide-events.git
cd wide-events
corepack enable
pnpm install
pnpm build
```

Start the collector (pick any path for the DuckDB file; this example keeps it under `.data/`):

```bash
mkdir -p .data
WIDE_EVENTS_DUCKDB_PATH=./.data/wide-events.db pnpm --filter @wide-events/collector exec node dist/cli.js
```

By default the server listens on **4318**. Set `collectorUrl` / `url` in the SDK or client to match (e.g. `http://localhost:4318`).

**Published CLI (no clone):** Install `@wide-events/collector` from npm and run (see [`packages/collector/README.md`](packages/collector/README.md)):

```bash
WIDE_EVENTS_DUCKDB_PATH=./wide-events.db npx wide-events-collector
```

---

## Run the collector (Docker)

Official image: [`0luwasegun7/wide-events-collector`](https://hub.docker.com/r/0luwasegun7/wide-events-collector) on Docker Hub. Use a release tag such as `0.1.0` or `0.1`, or a `sha-…` tag from the project’s CI if you need a specific commit.

### Requirements

- **Docker** — [Docker Engine](https://docs.docker.com/engine/install/) or Docker Desktop installed, with permission to pull from Docker Hub and run containers.
- **Architecture** — Images are **linux/amd64**. On ARM (e.g. Apple Silicon), use Docker’s emulation or pass `--platform linux/amd64` to `docker pull` and `docker run`.
- **Port** — Host port **4318** available (or map a different host port to container port `4318`).
- **Disk** — A writable host directory for the volume below so the DuckDB file persists across restarts.
- **Network** — Outbound access to Docker Hub for `docker pull` unless the image is already present (air-gapped installs can `docker load` an exported image instead).

### Start the container

```bash
docker pull 0luwasegun7/wide-events-collector:0.1.0

docker run --rm \
  -e WIDE_EVENTS_DUCKDB_PATH=/data/wide-events.db \
  -v "$(pwd)/wide-events-data:/data" \
  -p 4318:4318 \
  0luwasegun7/wide-events-collector:0.1.0
```

Point instrumented apps at `http://localhost:4318` (or the host and port you map). The `-v` mount stores the database under `./wide-events-data` on the host.

---

## Collector configuration

**Required:** `WIDE_EVENTS_DUCKDB_PATH` — filesystem path to the DuckDB database file (created if missing).

**Optional** (defaults in parentheses): `WIDE_EVENTS_COLLECTOR_PORT` (4318), `WIDE_EVENTS_BATCH_SIZE`, `WIDE_EVENTS_BATCH_TIMEOUT_MS`, `WIDE_EVENTS_RETENTION_DAYS`, `WIDE_EVENTS_MAX_COLUMNS`, `WIDE_EVENTS_QUEUE_LIMIT`. See [`packages/collector/src/config.ts`](packages/collector/src/config.ts).

---

## Packages

| Package | Role |
|---------|------|
| `@wide-events/sdk` | Instrument Node or edge apps; send data to the collector. |
| `@wide-events/client` | Typed HTTP client for the collector’s query APIs. |
| `@wide-events/collector` | OTLP ingest, query API, and CLI (`wide-events-collector`). |

`@wide-events/internal` is shared library code pulled in automatically with the packages above; you do not install it directly.

---

Maintainers: [wide-events-maintainers.md](wide-events-maintainers.md).
