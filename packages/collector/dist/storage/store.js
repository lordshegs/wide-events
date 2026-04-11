import { BASELINE_COLUMN_NAMES, isBaselineColumn, quoteIdentifier, sanitizeIdentifier } from "@wide-events/internal";
import { QueueLimitExceededError } from "../errors.js";
import { noopCollectorLogger } from "../logger.js";
import { SerializedExecutor } from "./serialized-executor.js";
export class CollectorStore {
    database;
    schema;
    config;
    logger;
    executor = new SerializedExecutor();
    pending = [];
    flushTimer;
    pendingRowCount = 0;
    constructor(database, schema, config, logger = noopCollectorLogger) {
        this.database = database;
        this.schema = schema;
        this.config = config;
        this.logger = logger;
    }
    async enqueueRows(rows) {
        if (rows.length === 0) {
            return;
        }
        if (this.pendingRowCount + rows.length > this.config.queueLimit) {
            this.logger.warn({
                attemptedRows: rows.length,
                batchSize: this.config.batchSize,
                pendingRowCount: this.pendingRowCount,
                queueLimit: this.config.queueLimit
            }, "collector queue saturated");
            throw new QueueLimitExceededError(this.config.queueLimit, this.pendingRowCount, rows.length, this.config.batchSize);
        }
        return await new Promise((resolve, reject) => {
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
    async flush() {
        if (this.pendingRowCount === 0) {
            return;
        }
        await this.flushSoon();
    }
    async runRetention(now = new Date()) {
        const cutoff = new Date(now.getTime() - this.config.retentionDays * 24 * 60 * 60 * 1_000).toISOString();
        this.logger.info({
            cutoff,
            retentionDays: this.config.retentionDays
        }, "collector retention started");
        try {
            await this.executor.enqueue(async () => {
                await this.database.execute("DELETE FROM events WHERE ts < ?", [cutoff]);
                await this.database.execute("CHECKPOINT");
            });
            this.logger.info({
                cutoff,
                retentionDays: this.config.retentionDays
            }, "collector retention completed");
        }
        catch (error) {
            this.logger.error({
                cutoff,
                retentionDays: this.config.retentionDays,
                err: error instanceof Error ? error : new Error(String(error))
            }, "collector retention failed");
            throw error;
        }
    }
    async flushSoon() {
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
                const droppedColumns = await this.schema.ensureDynamicColumns(this.database, collectDynamicColumns(rows));
                if (droppedColumns.length > 0) {
                    this.logger.warn({
                        droppedColumns,
                        droppedCount: droppedColumns.length,
                        maxColumns: this.config.maxColumns
                    }, "collector dropped dynamic columns after reaching schema cap");
                }
                await insertRows(this.database, this.schema, rows);
            });
            for (const entry of batch) {
                entry.resolve();
            }
        }
        catch (error) {
            for (const entry of batch) {
                entry.reject(error);
            }
        }
    }
}
function collectDynamicColumns(rows) {
    const columnSet = new Set();
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
async function insertRows(database, schema, rows) {
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
    const values = [];
    for (const row of rows) {
        for (const column of columnNames) {
            values.push(serializeRowValue(row[column]));
        }
    }
    await database.execute(sql, values);
}
function collectInsertColumns(schema, rows) {
    const columnSet = new Set(BASELINE_COLUMN_NAMES);
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (schema.isKnownColumn(key)) {
                columnSet.add(key);
            }
        }
    }
    return [...columnSet].sort();
}
function serializeRowValue(value) {
    if (value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean") {
        return value;
    }
    if (typeof value === "undefined") {
        return null;
    }
    return JSON.stringify(value);
}
//# sourceMappingURL=store.js.map