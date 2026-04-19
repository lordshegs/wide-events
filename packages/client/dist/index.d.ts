import type { ColumnInfo, QueryResult, StructuredQuery, TraceResult } from "./index.js";
export interface WideEventsClientOptions {
    url: string;
    fetchImpl?: typeof fetch;
}
export declare class WideEventsClient {
    private readonly baseUrl;
    private readonly fetchImpl;
    constructor(options: WideEventsClientOptions);
    query(request: StructuredQuery): Promise<QueryResult>;
    sql(sql: string): Promise<QueryResult>;
    getColumns(): Promise<ColumnInfo[]>;
    getTrace(traceId: string): Promise<TraceResult>;
    private getJson;
    private postJson;
}
//# sourceMappingURL=index.d.ts.map