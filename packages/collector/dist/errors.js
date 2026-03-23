import { ZodError } from "zod";
export class CollectorError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = new.target.name;
    }
}
export class BadRequestError extends CollectorError {
    constructor(message) {
        super(message, 400);
    }
}
export class ServiceUnavailableError extends CollectorError {
    constructor(message) {
        super(message, 503);
    }
}
export class QueueLimitExceededError extends ServiceUnavailableError {
    queueLimit;
    pendingRowCount;
    attemptedRows;
    batchSize;
    constructor(queueLimit, pendingRowCount, attemptedRows, batchSize) {
        super("Collector queue limit exceeded");
        this.queueLimit = queueLimit;
        this.pendingRowCount = pendingRowCount;
        this.attemptedRows = attemptedRows;
        this.batchSize = batchSize;
    }
}
export function resolveCollectorError(error) {
    if (error instanceof QueueLimitExceededError) {
        return {
            logLevel: "warn",
            message: error.message,
            statusCode: error.statusCode
        };
    }
    if (error instanceof CollectorError) {
        return {
            logLevel: error.statusCode >= 500 ? "error" : "warn",
            message: error.message,
            statusCode: error.statusCode
        };
    }
    if (error instanceof ZodError) {
        return {
            logLevel: "warn",
            message: formatZodError(error),
            statusCode: 400
        };
    }
    return {
        logLevel: "error",
        message: "Internal collector error",
        statusCode: 500
    };
}
function formatZodError(error) {
    const [issue] = error.issues;
    if (!issue) {
        return "Invalid request";
    }
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
}
//# sourceMappingURL=errors.js.map