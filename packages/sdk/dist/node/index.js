import { buildAnnotatedAttributes } from "../shared/attributes.js";
import { resolveNodeOptions } from "../shared/options.js";
import { wrapLambdaHandler } from "./lambda.js";
import { annotateCurrentSpan, createMiddleware } from "./middleware.js";
import { acquireNodeRuntime } from "./runtime-registry.js";
import { annotateActiveSpan as annotateActiveOpenTelemetrySpan } from "./span.js";
const noopMiddleware = () => (_request, _response, next) => {
    next();
};
export class WideEvents {
    releaseRuntime;
    runtime;
    options;
    constructor(options) {
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
    annotate(attributes, options) {
        if (this.options.disabled || !this.runtime) {
            return;
        }
        annotateCurrentSpan(buildAnnotatedAttributes(attributes, options));
    }
    annotateActiveSpan(attributes, options) {
        if (this.options.disabled || !this.runtime) {
            return;
        }
        annotateActiveOpenTelemetrySpan(buildAnnotatedAttributes(attributes, options));
    }
    async forceFlush() {
        if (this.options.disabled || !this.runtime) {
            return;
        }
        await this.runtime.forceFlush();
    }
    wrapHandler(handler) {
        if (!this.runtime || this.options.disabled) {
            return async (event, context) => await handler(event, context);
        }
        return wrapLambdaHandler(this.runtime, handler);
    }
    async shutdown() {
        if (this.releaseRuntime) {
            await this.releaseRuntime();
        }
    }
}
//# sourceMappingURL=index.js.map