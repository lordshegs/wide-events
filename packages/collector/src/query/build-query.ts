import {
  parseDurationWindow,
  quoteIdentifier,
  sanitizeIdentifier,
  type EventPrimitive,
  type QueryFilter,
  type QuerySelectItem,
  type StructuredQuery
} from "@wide-events/internal";

export interface CompiledQuery {
  sql: string;
  params: EventPrimitive[];
}

const MUTATING_SQL_PATTERN =
  /\b(insert|update|delete|alter|drop|create|replace|truncate|attach|detach|copy)\b/iu;
const READ_ONLY_SQL_PATTERN = /^(select|with|pragma|describe|show|explain)\b/iu;

export function compileStructuredQuery(query: StructuredQuery): CompiledQuery {
  if (query.select.length === 0) {
    throw new Error("Structured query must include at least one select item");
  }

  const params: EventPrimitive[] = [];
  const selectSql = query.select.map(compileSelect).join(", ");
  const whereParts: string[] = [];

  if (query.timeRange) {
    const milliseconds = parseDurationWindow(query.timeRange.last);
    params.push(new Date(Date.now() - milliseconds).toISOString());
    whereParts.push("ts >= ?");
  }

  for (const filter of query.filters ?? []) {
    whereParts.push(compileFilter(filter, params));
  }

  const groupBy = (query.groupBy ?? []).map(quoteIdentifier);
  const orderBy = query.orderBy
    ? ` ORDER BY ${quoteIdentifier(sanitizeIdentifier(query.orderBy.field))} ${
        query.orderBy.dir.toUpperCase() === "DESC" ? "DESC" : "ASC"
      }`
    : "";
  const limit =
    typeof query.limit === "number" ? ` LIMIT ${Math.max(1, Math.trunc(query.limit))}` : "";

  const sql =
    `SELECT ${selectSql} FROM events` +
    (whereParts.length > 0 ? ` WHERE ${whereParts.join(" AND ")}` : "") +
    (groupBy.length > 0 ? ` GROUP BY ${groupBy.join(", ")}` : "") +
    orderBy +
    limit;

  return { sql, params };
}

export function assertReadOnlySql(sql: string): void {
  const trimmed = sql.trim();
  if (!READ_ONLY_SQL_PATTERN.test(trimmed) || MUTATING_SQL_PATTERN.test(trimmed)) {
    throw new Error("Only read-only SQL statements are allowed");
  }
}

function compileSelect(select: QuerySelectItem): string {
  const alias = select.as ? ` AS ${quoteIdentifier(sanitizeIdentifier(select.as))}` : "";

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
      throw new Error(`Unsupported aggregate: ${select.fn satisfies never}`);
  }
}

function percentileSelect(
  percentile: number,
  select: QuerySelectItem,
  alias: string
): string {
  return `PERCENTILE_CONT(${percentile}) WITHIN GROUP (ORDER BY ${quoteIdentifier(
    requireField(select)
  )})${alias}`;
}

function compileFilter(filter: QueryFilter, params: EventPrimitive[]): string {
  const field = quoteIdentifier(filter.field);

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
        throw new Error("IN filters require a non-empty array");
      }

      params.push(...filter.value);
      return `${field} IN (${filter.value.map(() => "?").join(", ")})`;
    }
    default:
      throw new Error(`Unsupported filter operator: ${filter.op satisfies never}`);
  }
}

function normalizeScalar(value: QueryFilter["value"]): EventPrimitive {
  if (Array.isArray(value)) {
    throw new Error("Scalar filter received an array");
  }

  return value as EventPrimitive;
}

function requireField(select: QuerySelectItem): string {
  if (!select.field) {
    throw new Error(`${select.fn} requires a field`);
  }

  return sanitizeIdentifier(select.field);
}
