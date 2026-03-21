# wide-events

`wide-events` is a self-hostable observability stack for wide-event style
trace analysis on DuckDB.

## Packages

- `@wide-events/internal`: shared contracts and schema utilities.
- `@wide-events/sdk`: Node and edge instrumentation SDK.
- `@wide-events/collector`: OTLP ingest + query API + CLI.
- `@wide-events/client`: typed HTTP client for the collector API.

## Local Development

```bash
pnpm install
pnpm build
pnpm test
```

Start the collector:

```bash
WIDE_EVENTS_DUCKDB_PATH=./.data/wide-events.db pnpm --filter @wide-events/collector exec node dist/cli.js
```

## Release and Publish (Changesets)

### Local release flow

1. Add a changeset:

```bash
pnpm changeset
```

2. Apply version bumps and changelogs:

```bash
pnpm version-packages
```

3. Publish:

```bash
pnpm release
```

Changesets resolves dependency order automatically, so `@wide-events/internal`
is published before dependent packages (`sdk`, `client`, `collector`).

### CI release flow

Use a two-step Changesets flow:

1. PRs run checks and include a changeset file.
2. On merge to `main`, run:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm changeset publish
```

Set `NPM_TOKEN` in CI so publish can authenticate.
