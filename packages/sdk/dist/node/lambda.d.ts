import { type NodeWideEventsRuntime } from "./runtime.js";
export declare function wrapLambdaHandler<TEvent, TContext, TResult>(runtime: NodeWideEventsRuntime, handler: (event: TEvent, context: TContext) => Promise<TResult> | TResult): (event: TEvent, invocationContext: TContext) => Promise<TResult>;
//# sourceMappingURL=lambda.d.ts.map