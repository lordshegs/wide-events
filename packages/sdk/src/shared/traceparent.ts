const TRACEPARENT_PATTERN =
  /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/iu;

export interface ParsedTraceparent {
  traceId: string;
  parentSpanId: string;
}

export function parseTraceparent(value: string): ParsedTraceparent | null {
  const match = TRACEPARENT_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const traceId = match[1];
  const parentSpanId = match[2];
  if (!traceId || !parentSpanId) {
    return null;
  }

  return {
    traceId,
    parentSpanId
  };
}

export function formatTraceparent(traceId: string, spanId: string): string {
  return `00-${traceId}-${spanId}-01`;
}
