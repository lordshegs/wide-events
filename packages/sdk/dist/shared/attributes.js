import { isBaselineColumn, isPrimitiveEventValue, PROMOTION_HINT_PREFIX } from "..";
export function normalizeAttributes(attributes) {
    const normalized = {};
    for (const [key, value] of Object.entries(attributes)) {
        if (!isPrimitiveEventValue(value) && typeof value !== "undefined") {
            throw new Error(`annotate() attribute "${key}" must be a primitive value`);
        }
        normalized[key] = typeof value === "undefined" ? null : value;
    }
    return normalized;
}
export function buildAnnotatedAttributes(attributes, options) {
    const normalized = normalizeAttributes(attributes);
    for (const key of options?.promote ?? []) {
        if (!(key in normalized)) {
            throw new Error(`annotate() promote key "${key}" is missing from attributes`);
        }
        if (isBaselineColumn(key)) {
            throw new Error(`annotate() cannot promote baseline column "${key}"`);
        }
        normalized[`${PROMOTION_HINT_PREFIX}${key}`] = true;
    }
    return normalized;
}
export function toSpanAttributes(attributes) {
    const spanAttributes = {};
    for (const [key, value] of Object.entries(attributes)) {
        if (value === null) {
            continue;
        }
        if (typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean") {
            spanAttributes[key] = value;
        }
    }
    return spanAttributes;
}
export function toOtlpAttributes(attributes) {
    return Object.entries(attributes).map(([key, value]) => ({
        key,
        value: toOtlpValue(value)
    }));
}
function toOtlpValue(value) {
    if (typeof value === "string") {
        return { stringValue: value };
    }
    if (typeof value === "boolean") {
        return { boolValue: value };
    }
    if (typeof value === "number") {
        return Number.isInteger(value)
            ? { intValue: String(value) }
            : { doubleValue: value };
    }
    if (value === null) {
        return { stringValue: "null" };
    }
    if (Array.isArray(value)) {
        return {
            arrayValue: {
                values: value.map((entry) => toOtlpValue(entry))
            }
        };
    }
    return {
        kvlistValue: {
            values: Object.entries(value).map(([key, entry]) => ({
                key,
                value: toOtlpValue(entry)
            }))
        }
    };
}
//# sourceMappingURL=attributes.js.map