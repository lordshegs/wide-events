import { parseDurationWindow, quoteIdentifier, sanitizeIdentifier } from "../index.js";
import { BadRequestError } from "../errors.js";
const MUTATING_SQL_PATTERN = /\b(insert|update|delete|alter|drop|create|replace|truncate|attach|detach|copy)\b/iu;
const READ_ONLY_SQL_PATTERN = /^(select|with|pragma|describe|show|explain)\b/iu;
export function compileStructuredQuery(query) {
    try {
        if (query.select.length === 0) {
            throw new BadRequestError("Structured query must include at least one select item");
        }
        const params = [];
        const whereParts = [];
        const scope = query.scope ?? "main";
        const filters = [...(query.filters ?? [])];
        const groupByFields = (query.groupBy ?? []).map(sanitizeIdentifier);
        const selectParts = [
            ...groupByFields.map(quoteSanitizedIdentifier),
            ...query.select.map(compileSelect)
        ];
        const selectSql = selectParts.join(", ");
        if (scope === "main" &&
            filters.some((filter) => sanitizeFilterField(filter) === "main")) {
            throw new BadRequestError('Structured query scope "main" already applies main=true; remove the explicit main filter');
        }
        if (scope === "main") {
            params.push(true);
            whereParts.push('"main" = ?');
        }
        if (query.timeRange) {
            const milliseconds = parseDurationWindow(query.timeRange.last);
            params.push(new Date(Date.now() - milliseconds).toISOString());
            whereParts.push("ts >= ?");
        }
        for (const filter of filters) {
            whereParts.push(compileFilter(filter, params));
        }
        const groupBy = groupByFields.map(quoteSanitizedIdentifier);
        const orderBy = query.orderBy
            ? ` ORDER BY ${quoteSanitizedIdentifier(sanitizeIdentifier(query.orderBy.field))} ${query.orderBy.dir.toUpperCase() === "DESC" ? "DESC" : "ASC"}`
            : "";
        const limit = typeof query.limit === "number"
            ? ` LIMIT ${Math.max(1, Math.trunc(query.limit))}`
            : "";
        const sql = `SELECT ${selectSql} FROM events` +
            (whereParts.length > 0 ? ` WHERE ${whereParts.join(" AND ")}` : "") +
            (groupBy.length > 0 ? ` GROUP BY ${groupBy.join(", ")}` : "") +
            orderBy +
            limit;
        return { sql, params };
    }
    catch (error) {
        if (error instanceof BadRequestError) {
            throw error;
        }
        if (error instanceof Error) {
            throw new BadRequestError(error.message);
        }
        throw error;
    }
}
export function assertReadOnlySql(sql) {
    const trimmed = sql.trim();
    if (!READ_ONLY_SQL_PATTERN.test(trimmed) || MUTATING_SQL_PATTERN.test(trimmed)) {
        throw new BadRequestError("Only read-only SQL statements are allowed");
    }
}
function compileSelect(select) {
    const alias = select.as
        ? ` AS ${quoteSanitizedIdentifier(sanitizeIdentifier(select.as))}`
        : "";
    switch (select.fn) {
        case "COUNT":
            return `COUNT(*)${alias}`;
        case "SUM":
        case "AVG":
        case "MIN":
        case "MAX":
            return `${select.fn}(${quoteIdentifier(requireField(select))})${alias}`;
        case "P50":
            return percentileSelect(0.5, select, alias);
        case "P95":
            return percentileSelect(0.95, select, alias);
        case "P99":
            return percentileSelect(0.99, select, alias);
        default:
            throw new BadRequestError("Unsupported aggregate");
    }
}
function percentileSelect(percentile, select, alias) {
    return `PERCENTILE_CONT(${percentile}) WITHIN GROUP (ORDER BY ${quoteSanitizedIdentifier(requireField(select))})${alias}`;
}
function compileFilter(filter, params) {
    const field = quoteSanitizedIdentifier(sanitizeFilterField(filter));
    switch (filter.op) {
        case "eq":
            params.push(normalizeScalar(filter.value));
            return `${field} = ?`;
        case "neq":
            params.push(normalizeScalar(filter.value));
            return `${field} <> ?`;
        case "gt":
            params.push(normalizeScalar(filter.value));
            return `${field} > ?`;
        case "gte":
            params.push(normalizeScalar(filter.value));
            return `${field} >= ?`;
        case "lt":
            params.push(normalizeScalar(filter.value));
            return `${field} < ?`;
        case "lte":
            params.push(normalizeScalar(filter.value));
            return `${field} <= ?`;
        case "in": {
            if (!Array.isArray(filter.value) || filter.value.length === 0) {
                throw new BadRequestError("IN filters require a non-empty array");
            }
            const values = filter.value;
            for (const value of values) {
                params.push(value);
            }
            return `${field} IN (${values.map(() => "?").join(", ")})`;
        }
        default:
            throw new BadRequestError("Unsupported filter operator");
    }
}
function normalizeScalar(value) {
    if (Array.isArray(value)) {
        throw new BadRequestError("Scalar filter received an array");
    }
    return value;
}
function requireField(select) {
    if (!select.field) {
        throw new BadRequestError(`${select.fn} requires a field`);
    }
    return sanitizeIdentifier(select.field);
}
function sanitizeFilterField(filter) {
    return sanitizeIdentifier(filter.field);
}
function quoteSanitizedIdentifier(identifier) {
    return `"${identifier}"`;
}
//# sourceMappingURL=build-query.js.map