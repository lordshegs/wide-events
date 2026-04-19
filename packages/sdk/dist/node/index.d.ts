import { type AnnotateOptions, type AnnotationAttributes } from "../shared/attributes.js";
import { type ResolvedWideEventsOptions, type WideEventsOptions } from "../shared/options.js";
export declare class WideEvents {
    private readonly releaseRuntime;
    private readonly runtime;
    readonly options: ResolvedWideEventsOptions;
    constructor(options: WideEventsOptions);
    middleware(): (request: import("./middleware.js").MiddlewareRequest, response: import("./middleware.js").MiddlewareResponse, next: import("./middleware.js").MiddlewareNext) => void;
    annotate<T extends AnnotationAttributes>(attributes: T, options?: AnnotateOptions<T>): void;
    annotateActiveSpan<T extends AnnotationAttributes>(attributes: T, options?: AnnotateOptions<T>): void;
    forceFlush(): Promise<void>;
    wrapHandler<TEvent, TContext, TResult>(handler: (event: TEvent, context: TContext) => Promise<TResult> | TResult): (event: TEvent, context: TContext) => Promise<TResult>;
    shutdown(): Promise<void>;
}
export type { WideEventsOptions } from "../shared/options.js";
//# sourceMappingURL=index.d.ts.map