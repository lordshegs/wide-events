# @wide-events/collector

Collector service and CLI for ingesting OTLP traces and querying DuckDB-backed
wide events.

## Install

```bash
npm install @wide-events/collector
```

## Run

```bash
WIDE_EVENTS_DUCKDB_PATH=./wide-events.db npx wide-events-collector
```

## Required Environment Variables

- `WIDE_EVENTS_DUCKDB_PATH`: path to the DuckDB file.
