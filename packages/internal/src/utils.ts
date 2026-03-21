import { BASELINE_COLUMN_NAMES } from "./schema.js";
import type { EventPrimitive } from "./types.js";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9._-]+$/u;
const DURATION_PATTERN = /^(\d+)(ms|s|m|h|d)$/u;

export function sanitizeIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.length === 0) {
    throw new Error("Identifier cannot be empty");
  }

  if (!IDENTIFIER_PATTERN.test(trimmed)) {
    throw new Error(`Unsupported identifier: ${identifier}`);
  }

  return trimmed.replace(/"/gu, "");
}

export function quoteIdentifier(identifier: string): string {
  return `"${sanitizeIdentifier(identifier)}"`;
}

export function isBaselineColumn(field: string): boolean {
  return BASELINE_COLUMN_NAMES.includes(field);
}

export function parseDurationWindow(value: string): number {
  const match = DURATION_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Unsupported duration window: ${value}`);
  }

  const amountToken = match[1];
  const unit = match[2];
  if (!amountToken || !unit) {
    throw new Error(`Unsupported duration window: ${value}`);
  }

  const amount = Number.parseInt(amountToken, 10);

  switch (unit) {
    case "ms":
      return amount;
    case "s":
      return amount * 1_000;
    case "m":
      return amount * 60_000;
    case "h":
      return amount * 3_600_000;
    case "d":
      return amount * 86_400_000;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
}

export function normalizeEventPrimitive(value: unknown): EventPrimitive {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "undefined") {
    return null;
  }

  return JSON.stringify(value);
}

export function assertRecord(
  value: unknown,
  label: string
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}
