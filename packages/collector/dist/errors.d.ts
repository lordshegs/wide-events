export declare class CollectorError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare class BadRequestError extends CollectorError {
    constructor(message: string);
}
export declare class ServiceUnavailableError extends CollectorError {
    constructor(message: string);
}
export declare class QueueLimitExceededError extends ServiceUnavailableError {
    readonly queueLimit: number;
    readonly pendingRowCount: number;
    readonly attemptedRows: number;
    readonly batchSize: number;
    constructor(queueLimit: number, pendingRowCount: number, attemptedRows: number, batchSize: number);
}
export interface CollectorErrorResponse {
    logLevel: "warn" | "error";
    message: string;
    statusCode: number;
}
export declare function resolveCollectorError(error: unknown): CollectorErrorResponse;
//# sourceMappingURL=errors.d.ts.map