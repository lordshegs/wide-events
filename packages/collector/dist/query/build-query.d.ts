import { type EventPrimitive, type StructuredQuery } from "../index.js";
export interface CompiledQuery {
    sql: string;
    params: EventPrimitive[];
}
export declare function compileStructuredQuery(query: StructuredQuery): CompiledQuery;
export declare function assertReadOnlySql(sql: string): void;
//# sourceMappingURL=build-query.d.ts.map