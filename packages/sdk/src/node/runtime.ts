import { context, createContextKey, propagation } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { AwsInstrumentation } from "@opentelemetry/instrumentation-aws-sdk";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  AlwaysOnSampler,
  BatchSpanProcessor,
  NodeTracerProvider,
  SimpleSpanProcessor,
  type SpanExporter,
  TraceIdRatioBasedSampler
} from "@opentelemetry/sdk-trace-node";
import type { Instrumentation } from "@opentelemetry/instrumentation";
import {
  resolveNodeOptions,
  type ResolvedWideEventsOptions
} from "../shared/options";

export const MAIN_SPAN_KEY = createContextKey("wide-events.main-span");

export class NodeWideEventsRuntime {
  readonly options: ResolvedWideEventsOptions;
  readonly tracerProvider: NodeTracerProvider;
  readonly tracer;

  constructor(options: ResolvedWideEventsOptions) {
    this.options = resolveNodeOptions(options);

    const exporter = this.resolveExporter();
    const processor = this.options.traceExporter
      ? new SimpleSpanProcessor(exporter)
      : new BatchSpanProcessor(exporter);
    this.tracerProvider = new NodeTracerProvider({
      resource: resourceFromAttributes({
        "service.name": this.options.serviceName,
        "service.environment": this.options.environment
      }),
      sampler:
        this.options.sampleRate > 1
          ? new TraceIdRatioBasedSampler(1 / this.options.sampleRate)
          : new AlwaysOnSampler(),
      spanProcessors: [processor]
    });

    this.tracerProvider.register({
      contextManager: new AsyncLocalStorageContextManager().enable()
    });
    this.tracer = this.tracerProvider.getTracer("wide-events");

    registerInstrumentations({
      tracerProvider: this.tracerProvider,
      instrumentations: createNodeInstrumentations(this.options)
    });
  }

  async forceFlush(): Promise<void> {
    await this.tracerProvider.forceFlush();
  }

  async shutdown(): Promise<void> {
    await this.tracerProvider.shutdown();
  }

  shouldSample(): boolean {
    if (this.options.sampleRate <= 1) {
      return true;
    }

    return Math.random() < 1 / this.options.sampleRate;
  }

  createParentContext(headers: Record<string, string | string[] | undefined>) {
    return propagation.extract(context.active(), headers, {
      get(carrier, key) {
        return carrier[key];
      },
      keys(carrier) {
        return Object.keys(carrier);
      }
    });
  }

  private resolveExporter(): SpanExporter {
    if (this.options.traceExporter) {
      return this.options.traceExporter;
    }

    return new OTLPTraceExporter({
      url: `${this.options.collectorUrl.replace(/\/$/u, "")}/v1/traces`
    });
  }
}

export function createNodeInstrumentations(
  options: ResolvedWideEventsOptions
): Instrumentation[] {
  if (options.disabled) {
    return [];
  }

  const instrumentations = getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-http": {
      enabled: options.autoInstrument.http,
      disableIncomingRequestInstrumentation: true
    },
    "@opentelemetry/instrumentation-undici": {
      enabled: options.autoInstrument.fetch
    },
    "@opentelemetry/instrumentation-pg": {
      enabled: options.autoInstrument.postgres
    },
    "@opentelemetry/instrumentation-ioredis": {
      enabled: options.autoInstrument.redis
    },
    "@opentelemetry/instrumentation-redis": {
      enabled: options.autoInstrument.redis
    },
    "@opentelemetry/instrumentation-aws-sdk": {
      enabled: false
    }
  });

  if (options.autoInstrument.aws) {
    return [...instrumentations, new AwsInstrumentation()];
  }

  return instrumentations;
}
