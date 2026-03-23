import { type DynamicEventAttributes, type FlatEventRow } from "@wide-events/internal";
import type { OtlpExportTraceServiceRequest, OtlpSpan } from "./types.js";
export declare function flattenTraceRequest(request: OtlpExportTraceServiceRequest): FlatEventRow[];
export declare function flattenSpan(resourceAttributes: DynamicEventAttributes, span: OtlpSpan): FlatEventRow;
//# sourceMappingURL=flatten.d.ts.map