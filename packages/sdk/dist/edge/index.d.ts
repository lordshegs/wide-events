import { type AnnotationAttributes } from "../shared/attributes.js";
import { type EdgeWideEventsOptions, type ResolvedEdgeWideEventsOptions } from "../shared/options.js";
export declare class WideEvents {
    readonly options: ResolvedEdgeWideEventsOptions;
    private flushed;
    private readonly shouldExport;
    private readonly spanId;
    private traceId;
    private readonly startedAt;
    private parentSpanId;
    private readonly attributes;
    constructor(options: EdgeWideEventsOptions);
    annotate(attributes: AnnotationAttributes): void;
    setParentContext(traceparent: string): void;
    getTraceparent(): string;
    flush(fetchImpl?: typeof fetch): Promise<void>;
}
export type { EdgeWideEventsOptions } from "../shared/options.js";
//# sourceMappingURL=index.d.ts.map