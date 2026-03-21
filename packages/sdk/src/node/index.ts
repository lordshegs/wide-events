import type { DynamicEventAttributes } from "@wide-events/internal";
import { normalizeAttributes, type AnnotationAttributes } from "../shared/attributes.js";
import {
  resolveNodeOptions,
  type ResolvedWideEventsOptions,
  type WideEventsOptions
} from "../shared/options.js";
import { wrapLambdaHandler } from "./lambda.js";
import { annotateCurrentSpan, createMiddleware } from "./middleware.js";
import { NodeWideEventsRuntime } from "./runtime.js";

export class WideEvents {
  private readonly runtime: NodeWideEventsRuntime;
  readonly options: ResolvedWideEventsOptions;

  constructor(options: WideEventsOptions) {
    this.options = resolveNodeOptions(options);
    this.runtime = new NodeWideEventsRuntime(this.options);
  }

  middleware() {
    return createMiddleware(this.runtime);
  }

  annotate(attributes: AnnotationAttributes): void {
    if (this.options.disabled) {
      return;
    }

    annotateCurrentSpan(normalizeAttributes(attributes) as DynamicEventAttributes);
  }

  async forceFlush(): Promise<void> {
    if (this.options.disabled) {
      return;
    }

    await this.runtime.forceFlush();
  }

  wrapHandler<TEvent, TContext, TResult>(
    handler: (event: TEvent, context: TContext) => Promise<TResult> | TResult
  ) {
    return wrapLambdaHandler(this.runtime, handler);
  }

  async shutdown(): Promise<void> {
    await this.runtime.shutdown();
  }
}

export type { WideEventsOptions } from "../shared/options.js";
