import { type AttributeCatalogEntry, type ColumnInfo, type EventValue, type FlatEventRow, type InferredAttributeType, type PromotionStorageState } from "../index.js";
import type { DuckDbDatabase } from "./database.js";
import type { SchemaRegistry } from "./schema-registry.js";
interface PromotionCandidate extends AttributeCatalogEntry {
    nonNullRatio: number;
}
export declare class AttributeCatalog {
    private readonly entries;
    hydrate(database: DuckDbDatabase): Promise<void>;
    getPromotedColumns(): Map<string, {
        column: string;
        type: InferredAttributeType;
    }>;
    getEntry(key: string): AttributeCatalogEntry | null;
    getFieldStorageState(field: string): PromotionStorageState | "baseline" | "unknown";
    listColumns(schema: SchemaRegistry): ColumnInfo[];
    recordRows(database: DuckDbDatabase, rows: readonly FlatEventRow[]): Promise<void>;
    selectPromotionCandidates(totalRetainedRows: number, minRows: number, minRatio: number, limit: number): PromotionCandidate[];
    markPromoting(database: DuckDbDatabase, key: string): Promise<AttributeCatalogEntry | null>;
    markPromoted(database: DuckDbDatabase, key: string, promotedColumn: string, promotedType: InferredAttributeType): Promise<void>;
    markFailed(database: DuckDbDatabase, key: string, error: unknown): Promise<void>;
}
export declare function inferValueType(value: EventValue): InferredAttributeType;
export declare function mergeInferredType(current: InferredAttributeType, next: InferredAttributeType): InferredAttributeType;
export {};
//# sourceMappingURL=attribute-catalog.d.ts.map