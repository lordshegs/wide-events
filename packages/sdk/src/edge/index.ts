import type { EventPrimitive } from "@wide-events/internal";
import { normalizeAttributes, toOtlpAttributes, type AnnotationAttributes } from "../shared/attributes.js";
import { postJson } from "../shared/http.js";
import { createSpanId, createTraceId } from "../shared/ids.js";
import {
  edgeOptionsSchema,
  type EdgeWideEventsOptions,
  type ResolvedEdgeWideEventsOptions
} from "../shared/options.js";
import { formatTraceparent, parseTraceparent } from "../shared/traceparent.js";

export class WideEvents {
  readonly options: ResolvedEdgeWideEventsOptions;
  private flushed = false;
  private readonly shouldExport: boolean;
  private readonly spanId: string;
  private traceId: string;
  private readonly startedAt = Date.now();
  private parentSpanId: string | null = null;
  private readonly attributes = new Map<string, EventPrimitive>();

  constructor(options: EdgeWideEventsOptions) {
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

  annotate(attributes: AnnotationAttributes): void {
    if (this.options.disabled) {
      return;
    }

    for (const [key, value] of Object.entries(normalizeAttributes(attributes))) {
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        this.attributes.set(key, value);
      }
    }
  }

  setParentContext(traceparent: string): void {
    const parsed = parseTraceparent(traceparent);
    if (!parsed) {
      return;
    }

    this.parentSpanId = parsed.parentSpanId;
    this.traceId = parsed.traceId;
  }

  getTraceparent(): string {
    return formatTraceparent(this.traceId, this.spanId);
  }

  async flush(fetchImpl: typeof fetch = fetch): Promise<void> {
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
                  startTimeUnixNano: String(BigInt(this.startedAt) * 1_000_000n),
                  endTimeUnixNano: String(BigInt(now) * 1_000_000n),
                  attributes: toOtlpAttributes(
                    Object.fromEntries(this.attributes.entries())
                  )
                }
              ]
            }
          ]
        }
      ]
    };

    await postJson(
      fetchImpl,
      `${this.options.collectorUrl.replace(/\/$/u, "")}/v1/traces`,
      body
    );
    this.flushed = true;
  }
}

export type { EdgeWideEventsOptions } from "../shared/options.js";
