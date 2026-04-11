import { normalizeEventPrimitive } from "@wide-events/internal";
export function normalizeAttributes(attributes) {
    const normalized = {};
    for (const [key, value] of Object.entries(attributes)) {
        normalized[key] = normalizeEventPrimitive(value);
    }
    return normalized;
}
export function toSpanAttributes(attributes) {
    const spanAttributes = {};
    for (const [key, value] of Object.entries(attributes)) {
        if (value === null) {
            continue;
        }
        spanAttributes[key] = value;
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
    return { stringValue: "null" };
}
//# sourceMappingURL=attributes.js.map