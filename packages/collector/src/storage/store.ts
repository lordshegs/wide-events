import {
  BASELINE_COLUMN_NAMES,
  isBaselineColumn,
  quoteIdentifier,
  sanitizeIdentifier,
  type FlatEventRow
} from "@wide-events/internal";
import type { CollectorConfig } from "../config.js";
import { DuckDbDatabase } from "./database.js";
import { SchemaRegistry } from "./schema-registry.js";
import { SerializedExecutor } from "./serialized-executor.js";

interface PendingBatch {
  rows: FlatEventRow[];
  resolve: () => void;
  reject: (error: unknown) => void;
}

export class CollectorStore {
  private readonly executor = new SerializedExecutor();
  private readonly pending: PendingBatch[] = [];
  private flushTimer: NodeJS.Timeout | undefined;
  private pendingRowCount = 0;

  constructor(
    private readonly database: DuckDbDatabase,
    private readonly schema: SchemaRegistry,
    private readonly config: CollectorConfig
  ) {}

  async enqueueRows(rows: readonly FlatEventRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    if (this.pendingRowCount + rows.length > this.config.queueLimit) {
      throw new Error("Collector queue limit exceeded");
    }

    return await new Promise<void>((resolve, reject) => {
      this.pending.push({
        rows: [...rows],
        resolve,
        reject
      });
      this.pendingRowCount += rows.length;

      if (this.pendingRowCount >= this.config.batchSize) {
        void this.flushSoon();
        return;
      }

      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          void this.flushSoon();
        }, this.config.batchTimeoutMs);
      }
    });
  }

  async flush(): Promise<void> {
    if (this.pendingRowCount === 0) {
      return;
    }

    await this.flushSoon();
  }

  async runRetention(now: Date = new Date()): Promise<void> {
    const cutoff = new Date(
      now.getTime() - this.config.retentionDays * 24 * 60 * 60 * 1_000
    ).toISOString();

    await this.executor.enqueue(async () => {
      await this.database.execute("DELETE FROM events WHERE ts < ?", [cutoff]);
      await this.database.execute("CHECKPOINT");
    });
  }

  private async flushSoon(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    const batch = this.pending.splice(0, this.pending.length);
    if (batch.length === 0) {
      return;
    }

    const rows = batch.flatMap((entry) => entry.rows);
    this.pendingRowCount -= rows.length;

    try {
      await this.executor.enqueue(async () => {
        await this.schema.ensureDynamicColumns(
          this.database,
          collectDynamicColumns(rows)
        );
        await insertRows(this.database, rows);
      });

      for (const entry of batch) {
        entry.resolve();
      }
    } catch (error) {
      for (const entry of batch) {
        entry.reject(error);
      }
    }
  }
}

function collectDynamicColumns(rows: readonly FlatEventRow[]): string[] {
  const columnSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (isBaselineColumn(key)) {
        continue;
      }

      sanitizeIdentifier(key);
      columnSet.add(key);
    }
  }

  return [...columnSet].sort();
}

async function insertRows(
  database: DuckDbDatabase,
  rows: readonly FlatEventRow[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const columnNames = collectInsertColumns(rows);
  const placeholders = rows
    .map(() => `(${columnNames.map(() => "?").join(", ")})`)
    .join(", ");
  const sql = `INSERT INTO events (${columnNames
    .map((column) => quoteIdentifier(column))
    .join(", ")}) VALUES ${placeholders}`;

  const values: unknown[] = [];
  for (const row of rows) {
    for (const column of columnNames) {
      values.push(serializeRowValue(row[column]));
    }
  }

  await database.execute(sql, values);
}

function collectInsertColumns(rows: readonly FlatEventRow[]): string[] {
  const columnSet = new Set<string>(BASELINE_COLUMN_NAMES);
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columnSet.add(key);
    }
  }

  return [...columnSet].sort();
}

function serializeRowValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "undefined") {
    return null;
  }

  return JSON.stringify(value);
}
