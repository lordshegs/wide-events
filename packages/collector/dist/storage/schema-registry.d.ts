import type { DuckDbDatabase } from "./database.js";
export declare class SchemaRegistry {
    private readonly maxPromotedColumns;
    private readonly columns;
    constructor(maxPromotedColumns: number);
    hydrate(database: DuckDbDatabase): Promise<void>;
    listActualColumns(): Array<{
        name: string;
        type: string;
    }>;
    isKnownColumn(name: string): boolean;
    isQueryableColumn(name: string): boolean;
    promotedColumnCount(): number;
    ensurePromotedColumn(database: DuckDbDatabase, column: string, type: string): Promise<boolean>;
}
//# sourceMappingURL=schema-registry.d.ts.map