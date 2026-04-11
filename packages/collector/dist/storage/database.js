import { DuckDBInstance } from "@duckdb/node-api";
import { BASE_TABLE_SQL } from "@wide-events/internal";
export class DuckDbDatabase {
    instance;
    writer;
    constructor(instance, writer) {
        this.instance = instance;
        this.writer = writer;
    }
    static async create(path) {
        const instance = await DuckDBInstance.create(path);
        const writer = await instance.connect();
        const database = new DuckDbDatabase(instance, writer);
        await database.writer.run(BASE_TABLE_SQL);
        return database;
    }
    async execute(sql, values = []) {
        await this.writer.run(sql, toDuckDbValues(values));
    }
    async executeRead(sql, values = []) {
        const readerConnection = await this.instance.connect();
        try {
            const reader = await readerConnection.runAndReadAll(sql, toDuckDbValues(values));
            return normalizeRows(reader.getRowObjectsJS());
        }
        finally {
            readerConnection.closeSync();
        }
    }
    async executeWriteQuery(sql, values = []) {
        const reader = await this.writer.runAndReadAll(sql, toDuckDbValues(values));
        return normalizeRows(reader.getRowObjectsJS());
    }
    close() {
        this.writer.closeSync();
        this.instance.closeSync();
    }
}
function normalizeRows(rows) {
    return rows.map((row) => {
        const normalized = {};
        for (const [key, value] of Object.entries(row)) {
            normalized[key] = normalizeResultValue(value);
        }
        return normalized;
    });
}
function normalizeResultValue(value) {
    if (value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean") {
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
function toDuckDbValues(values) {
    return values.map((value) => {
        if (value === null ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            typeof value === "bigint") {
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
//# sourceMappingURL=database.js.map