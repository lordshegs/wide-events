import {
  BASELINE_COLUMN_NAMES,
  isBaselineColumn,
  quoteIdentifier,
  sanitizeIdentifier,
  type FlatEventRow
} from "@wide-events/internal";
import type { CollectorConfig } from "../config.js";
import { QueueLimitExceededError } from "../errors.js";
import { noopCollectorLogger, type CollectorLogger } from "../logger.js";
import type { DuckDbDatabase } from "./database.js";
import type { SchemaRegistry } from "./schema-registry.js";
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
    private readonly config: CollectorConfig,
    private readonly logger: CollectorLogger = noopCollectorLogger
  ) {}

  async enqueueRows(rows: readonly FlatEventRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    if (this.pendingRowCount + rows.length > this.config.queueLimit) {
      this.logger.warn(
        {
          attemptedRows: rows.length,
          batchSize: this.config.batchSize,
          pendingRowCount: this.pendingRowCount,
          queueLimit: this.config.queueLimit
        },
        "collector queue saturated"
      );
      throw new QueueLimitExceededError(
        this.config.queueLimit,
        this.pendingRowCount,
        rows.length,
        this.config.batchSize
      );
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

    this.logger.info(
      {
        cutoff,
        retentionDays: this.config.retentionDays
      },
      "collector retention started"
    );

    try {
      await this.executor.enqueue(async () => {
        await this.database.execute("DELETE FROM events WHERE ts < ?", [cutoff]);
        await this.database.execute("CHECKPOINT");
      });

      this.logger.info(
        {
          cutoff,
          retentionDays: this.config.retentionDays
        },
        "collector retention completed"
      );
    } catch (error) {
      this.logger.error(
        {
          cutoff,
          retentionDays: this.config.retentionDays,
          err: error instanceof Error ? error : new Error(String(error))
        },
        "collector retention failed"
      );
      throw error;
    }
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
        const droppedColumns = await this.schema.ensureDynamicColumns(
          this.database,
          collectDynamicColumns(rows)
        );
        if (droppedColumns.length > 0) {
          this.logger.warn(
            {
              droppedColumns,
              droppedCount: droppedColumns.length,
              maxColumns: this.config.maxColumns
            },
            "collector dropped dynamic columns after reaching schema cap"
          );
        }

        await insertRows(this.database, this.schema, rows);
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
  schema: SchemaRegistry,
  rows: readonly FlatEventRow[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const columnNames = collectInsertColumns(schema, rows);
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

function collectInsertColumns(
  schema: SchemaRegistry,
  rows: readonly FlatEventRow[]
): string[] {
  const columnSet = new Set<string>(BASELINE_COLUMN_NAMES);
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (schema.isKnownColumn(key)) {
        columnSet.add(key);
      }
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
