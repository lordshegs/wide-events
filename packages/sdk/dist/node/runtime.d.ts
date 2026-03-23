import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { type ResolvedWideEventsOptions } from "../shared/options.js";
export declare const MAIN_SPAN_KEY: symbol;
export declare class NodeWideEventsRuntime {
    readonly options: ResolvedWideEventsOptions;
    readonly tracerProvider: NodeTracerProvider;
    readonly tracer: import("@opentelemetry/api").Tracer;
    constructor(options: ResolvedWideEventsOptions);
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
    shouldSample(): boolean;
    createParentContext(headers: Record<string, string | string[] | undefined>): import("@opentelemetry/api").Context;
    private resolveExporter;
}
//# sourceMappingURL=runtime.d.ts.map