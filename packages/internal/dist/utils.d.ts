import type { EventValue } from "./types.js";
export declare const PROMOTION_HINT_PREFIX = "wide_events.promote.";
export declare function sanitizeIdentifier(identifier: string): string;
export declare function quoteIdentifier(identifier: string): string;
export declare function isBaselineColumn(field: string): boolean;
export declare function isPrimitiveEventValue(value: unknown): value is string | number | boolean | null;
export declare function isPromotionHintAttribute(key: string, value: unknown): key is `${typeof PROMOTION_HINT_PREFIX}${string}`;
export declare function getPromotionHintKey(key: string): string;
export declare function parseDurationWindow(value: string): number;
export declare function normalizeEventPrimitive(value: unknown): EventValue;
export declare function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown>;
//# sourceMappingURL=utils.d.ts.map