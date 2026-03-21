import {
  BASELINE_COLUMN_NAMES,
  BASELINE_COLUMN_TYPES,
  type ColumnInfo,
  quoteIdentifier,
  type QueryRow
} from "@wide-events/internal";
import { DuckDbDatabase } from "./database.js";

export class SchemaRegistry {
  private readonly columns = new Map<string, ColumnInfo>();

  constructor(private readonly maxColumns: number) {
    for (const [name, type] of Object.entries(BASELINE_COLUMN_TYPES)) {
      this.columns.set(name, {
        name,
        type,
        origin: "baseline"
      });
    }
  }

  async hydrate(database: DuckDbDatabase): Promise<void> {
    const rows = await database.executeWriteQuery("PRAGMA table_info('events')");

    for (const row of rows) {
      const name = expectString(row["name"], "PRAGMA table_info.name");
      const type = expectString(row["type"], "PRAGMA table_info.type");
      this.columns.set(name, {
        name,
        type,
        origin: BASELINE_COLUMN_NAMES.includes(name) ? "baseline" : "dynamic"
      });
    }
  }

  listColumns(): ColumnInfo[] {
    return [...this.columns.values()].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  isKnownColumn(name: string): boolean {
    return this.columns.has(name);
  }

  async ensureDynamicColumns(
    database: DuckDbDatabase,
    candidateColumns: readonly string[]
  ): Promise<string[]> {
    const dropped: string[] = [];

    for (const column of candidateColumns) {
      if (this.columns.has(column)) {
        continue;
      }

      if (this.columns.size >= this.maxColumns) {
        dropped.push(column);
        continue;
      }

      await database.execute(
        `ALTER TABLE events ADD COLUMN IF NOT EXISTS ${quoteIdentifier(column)} VARCHAR`
      );
      this.columns.set(column, {
        name: column,
        type: "VARCHAR",
        origin: "dynamic"
      });
    }

    return dropped;
  }
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }

  return value;
}
