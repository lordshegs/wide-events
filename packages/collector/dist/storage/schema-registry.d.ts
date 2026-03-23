import { type ColumnInfo } from "@wide-events/internal";
import type { DuckDbDatabase } from "./database.js";
export declare class SchemaRegistry {
    private readonly maxColumns;
    private readonly columns;
    constructor(maxColumns: number);
    hydrate(database: DuckDbDatabase): Promise<void>;
    listColumns(): ColumnInfo[];
    isKnownColumn(name: string): boolean;
    ensureDynamicColumns(database: DuckDbDatabase, candidateColumns: readonly string[]): Promise<string[]>;
}
//# sourceMappingURL=schema-registry.d.ts.map