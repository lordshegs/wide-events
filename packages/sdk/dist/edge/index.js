import { buildAnnotatedAttributes, toOtlpAttributes } from "../shared/attributes.js";
import { postJson } from "../shared/http.js";
import { createSpanId, createTraceId } from "../shared/ids.js";
import { edgeOptionsSchema } from "../shared/options.js";
import { formatTraceparent, parseTraceparent } from "../shared/traceparent.js";
export class WideEvents {
    options;
    flushed = false;
    shouldExport;
    spanId;
    traceId;
    startedAt = Date.now();
    parentSpanId = null;
    attributes = new Map();
    constructor(options) {
        this.options = edgeOptionsSchema.parse(options);
        this.shouldExport =
            !this.options.disabled &&
                (this.options.sampleRate <= 1 || Math.random() < 1 / this.options.sampleRate);
        this.spanId = createSpanId();
        this.traceId = createTraceId();
        this.attributes.set("sample_rate", this.options.sampleRate);
        this.attributes.set("service.name", this.options.serviceName);
        this.attributes.set("service.environment", this.options.environment);
    }
    annotate(attributes, options) {
        if (this.options.disabled) {
            return;
        }
        for (const [key, value] of Object.entries(buildAnnotatedAttributes(attributes, options))) {
            if (value === null ||
                typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean") {
                this.attributes.set(key, value);
            }
        }
    }
    setParentContext(traceparent) {
        const parsed = parseTraceparent(traceparent);
        if (!parsed) {
            return;
        }
        this.parentSpanId = parsed.parentSpanId;
        this.traceId = parsed.traceId;
    }
    getTraceparent() {
        return formatTraceparent(this.traceId, this.spanId);
    }
    async flush(fetchImpl = fetch) {
        if (this.options.disabled || this.flushed || !this.shouldExport) {
            this.flushed = true;
            return;
        }
        const now = Date.now();
        const body = {
            resourceSpans: [
                {
                    resource: {
                        attributes: toOtlpAttributes({
                            "service.name": this.options.serviceName,
                            "service.environment": this.options.environment
                        })
                    },
                    scopeSpans: [
                        {
                            spans: [
                                {
                                    traceId: this.traceId,
                                    spanId: this.spanId,
                                    parentSpanId: this.parentSpanId ?? undefined,
                                    startTimeUnixNano: String(BigInt(this.startedAt) * 1000000n),
                                    endTimeUnixNano: String(BigInt(now) * 1000000n),
                                    attributes: toOtlpAttributes(Object.fromEntries(this.attributes.entries()))
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        await postJson(fetchImpl, `${this.options.collectorUrl.replace(/\/$/u, "")}/v1/traces`, body);
        this.flushed = true;
    }
}
//# sourceMappingURL=index.js.map