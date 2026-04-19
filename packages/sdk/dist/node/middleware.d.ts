import type { DynamicEventAttributes } from "..";
import { type NodeWideEventsRuntime } from "./runtime.js";
export interface MiddlewareRequest {
    method?: string | undefined;
    url?: string | undefined;
    headers: Record<string, string | string[] | undefined>;
}
export interface MiddlewareResponse {
    statusCode?: number;
    once(event: "finish" | "close" | "error", listener: () => void): this;
}
export type MiddlewareNext = () => void;
export declare function createMiddleware(runtime: NodeWideEventsRuntime): (request: MiddlewareRequest, response: MiddlewareResponse, next: MiddlewareNext) => void;
export declare function annotateCurrentSpan(attributes: DynamicEventAttributes): void;
//# sourceMappingURL=middleware.d.ts.map