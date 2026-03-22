import { ZodError } from "zod";

export class CollectorError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends CollectorError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ServiceUnavailableError extends CollectorError {
  constructor(message: string) {
    super(message, 503);
  }
}

export class QueueLimitExceededError extends ServiceUnavailableError {
  constructor(
    readonly queueLimit: number,
    readonly pendingRowCount: number,
    readonly attemptedRows: number,
    readonly batchSize: number
  ) {
    super("Collector queue limit exceeded");
  }
}

export interface CollectorErrorResponse {
  logLevel: "warn" | "error";
  message: string;
  statusCode: number;
}

export function resolveCollectorError(error: unknown): CollectorErrorResponse {
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

function formatZodError(error: ZodError): string {
  const [issue] = error.issues;
  if (!issue) {
    return "Invalid request";
  }

  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}
