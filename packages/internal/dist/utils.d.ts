import type { EventPrimitive } from "./types.js";
export declare function sanitizeIdentifier(identifier: string): string;
export declare function quoteIdentifier(identifier: string): string;
export declare function isBaselineColumn(field: string): boolean;
export declare function parseDurationWindow(value: string): number;
export declare function normalizeEventPrimitive(value: unknown): EventPrimitive;
export declare function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown>;
//# sourceMappingURL=utils.d.ts.map