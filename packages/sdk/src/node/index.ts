import {
  buildAnnotatedAttributes,
  type AnnotateOptions,
  type AnnotationAttributes
} from "../shared/attributes";
import {
  resolveNodeOptions,
  type ResolvedWideEventsOptions,
  type WideEventsOptions
} from "../shared/options";
import { wrapLambdaHandler } from "./lambda";
import { annotateCurrentSpan, createMiddleware } from "./middleware";
import { acquireNodeRuntime } from "./runtime-registry";
import type { NodeWideEventsRuntime } from "./runtime";

const noopMiddleware = () => (_request: unknown, _response: unknown, next: () => void) => {
  next();
};

export class WideEvents {
  private readonly releaseRuntime: (() => Promise<void>) | null;
  private readonly runtime: NodeWideEventsRuntime | null;
  readonly options: ResolvedWideEventsOptions;

  constructor(options: WideEventsOptions) {
    this.options = resolveNodeOptions(options);
    if (this.options.disabled) {
      this.runtime = null;
      this.releaseRuntime = null;
      return;
    }

    const acquired = acquireNodeRuntime(this.options);
    this.runtime = acquired.runtime;
    this.releaseRuntime = async () => {
      await acquired.release();
    };
  }

  middleware() {
    return this.runtime ? createMiddleware(this.runtime) : noopMiddleware();
  }

  annotate<T extends AnnotationAttributes>(
    attributes: T,
    options?: AnnotateOptions<T>
  ): void {
    if (this.options.disabled || !this.runtime) {
      return;
    }

    annotateCurrentSpan(buildAnnotatedAttributes(attributes, options));
  }

  async forceFlush(): Promise<void> {
    if (this.options.disabled || !this.runtime) {
      return;
    }

    await this.runtime.forceFlush();
  }

  wrapHandler<TEvent, TContext, TResult>(
    handler: (event: TEvent, context: TContext) => Promise<TResult> | TResult
  ) {
    if (!this.runtime || this.options.disabled) {
      return async (event: TEvent, context: TContext): Promise<TResult> =>
        await handler(event, context);
    }

    return wrapLambdaHandler(this.runtime, handler);
  }

  async shutdown(): Promise<void> {
    if (this.releaseRuntime) {
      await this.releaseRuntime();
    }
  }
}

export type { WideEventsOptions } from "../shared/options";
