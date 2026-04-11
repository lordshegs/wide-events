export interface ParsedTraceparent {
    traceId: string;
    parentSpanId: string;
}
export declare function parseTraceparent(value: string): ParsedTraceparent | null;
export declare function formatTraceparent(traceId: string, spanId: string): string;
//# sourceMappingURL=traceparent.d.ts.map