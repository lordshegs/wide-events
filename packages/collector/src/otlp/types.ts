export interface OtlpExportTraceServiceRequest {
  resourceSpans?: OtlpResourceSpan[];
}

export interface OtlpResourceSpan {
  resource?: OtlpResource;
  scopeSpans?: OtlpScopeSpan[];
}

export interface OtlpResource {
  attributes?: OtlpKeyValue[];
}

export interface OtlpScopeSpan {
  spans?: OtlpSpan[];
}

export interface OtlpSpan {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  name?: string;
  startTimeUnixNano?: string;
  endTimeUnixNano?: string;
  attributes?: OtlpKeyValue[];
}

export interface OtlpKeyValue {
  key?: string;
  value?: OtlpAnyValue;
}

export interface OtlpAnyValue {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: string;
  doubleValue?: number;
  arrayValue?: {
    values?: OtlpAnyValue[];
  };
  kvlistValue?: {
    values?: OtlpKeyValue[];
  };
}
