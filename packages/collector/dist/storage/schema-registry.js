import { BASELINE_COLUMN_NAMES, BASELINE_COLUMN_TYPES, quoteIdentifier } from "@wide-events/internal";
export class SchemaRegistry {
    maxColumns;
    columns = new Map();
    constructor(maxColumns) {
        this.maxColumns = maxColumns;
        for (const [name, type] of Object.entries(BASELINE_COLUMN_TYPES)) {
            this.columns.set(name, {
                name,
                type,
                origin: "baseline"
            });
        }
    }
    async hydrate(database) {
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
    listColumns() {
        return [...this.columns.values()].sort((left, right) => left.name.localeCompare(right.name));
    }
    isKnownColumn(name) {
        return this.columns.has(name);
    }
    async ensureDynamicColumns(database, candidateColumns) {
        const dropped = [];
        for (const column of candidateColumns) {
            if (this.columns.has(column)) {
                continue;
            }
            if (this.columns.size >= this.maxColumns) {
                dropped.push(column);
                continue;
            }
            await database.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS ${quoteIdentifier(column)} VARCHAR`);
            this.columns.set(column, {
                name: column,
                type: "VARCHAR",
                origin: "dynamic"
            });
        }
        return dropped;
    }
}
function expectString(value, label) {
    if (typeof value !== "string") {
        throw new Error(`${label} must be a string`);
    }
    return value;
}
//# sourceMappingURL=schema-registry.js.map