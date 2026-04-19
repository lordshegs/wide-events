import { type QueryRow } from "../index.js";
export declare class DuckDbDatabase {
    private readonly instance;
    private readonly writer;
    private constructor();
    static create(path: string): Promise<DuckDbDatabase>;
    execute(sql: string, values?: readonly unknown[]): Promise<void>;
    executeRead(sql: string, values?: readonly unknown[]): Promise<QueryRow[]>;
    executeWriteQuery(sql: string, values?: readonly unknown[]): Promise<QueryRow[]>;
    close(): void;
}
//# sourceMappingURL=database.d.ts.map