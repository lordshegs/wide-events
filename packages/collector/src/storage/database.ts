import { DuckDBInstance, type DuckDBConnection, type DuckDBValue } from "@duckdb/node-api";
import { BASE_TABLE_SQL, type QueryRow } from "@wide-events/internal";

export class DuckDbDatabase {
  private constructor(
    private readonly instance: DuckDBInstance,
    private readonly writer: DuckDBConnection
  ) {}

  static async create(path: string): Promise<DuckDbDatabase> {
    const instance = await DuckDBInstance.create(path);
    const writer = await instance.connect();
    const database = new DuckDbDatabase(instance, writer);
    await database.writer.run(BASE_TABLE_SQL);
    return database;
  }

  async execute(sql: string, values: readonly unknown[] = []): Promise<void> {
    await this.writer.run(sql, toDuckDbValues(values));
  }

  async executeRead(sql: string, values: readonly unknown[] = []): Promise<QueryRow[]> {
    const readerConnection = await this.instance.connect();
    try {
      const reader = await readerConnection.runAndReadAll(
        sql,
        toDuckDbValues(values)
      );
      return normalizeRows(reader.getRowObjectsJS());
    } finally {
      readerConnection.closeSync();
    }
  }

  async executeWriteQuery(
    sql: string,
    values: readonly unknown[] = []
  ): Promise<QueryRow[]> {
    const reader = await this.writer.runAndReadAll(sql, toDuckDbValues(values));
    return normalizeRows(reader.getRowObjectsJS());
  }

  close(): void {
    this.writer.closeSync();
    this.instance.closeSync();
  }
}

function normalizeRows(rows: Record<string, unknown>[]): QueryRow[] {
  return rows.map((row) => {
    const normalized: QueryRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = normalizeResultValue(value);
    }
    return normalized;
  });
}

function normalizeResultValue(value: unknown): string | number | boolean | null {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "bigint") {
    const numericValue = Number(value);
    return Number.isSafeInteger(numericValue) ? numericValue : value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return JSON.stringify(value);
}

function toDuckDbValues(values: readonly unknown[]): DuckDBValue[] {
  return values.map((value) => {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "bigint"
    ) {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "undefined") {
      return null;
    }

    throw new Error(`Unsupported DuckDB parameter type: ${typeof value}`);
  });
}
