import { context, type Attributes, type HrTime, type Link, type Span, type SpanContext, type SpanStatus } from "@opentelemetry/api";
import { describe, expect, it } from "vitest";
import { createMiddleware } from "./middleware.js";
import type { NodeWideEventsRuntime } from "./runtime.js";

class FakeSpan implements Span {
  endCalls = 0;
  readonly attributes: Attributes = {};

  addEvent(_name: string, _attributesOrStartTime?: Attributes | HrTime, _startTime?: HrTime): this {
    return this;
  }

  addLink(_link: Link): this {
    return this;
  }

  addLinks(_links: Link[]): this {
    return this;
  }

  end(): void {
    this.endCalls += 1;
  }

  isRecording(): boolean {
    return true;
  }

  recordException(_exception: string | Error, _time?: HrTime): void {}

  setAttribute(key: string, value: string | number | boolean): this {
    this.attributes[key] = value;
    return this;
  }

  setAttributes(attributes: Attributes): this {
    Object.assign(this.attributes, attributes);
    return this;
  }

  setStatus(_status: SpanStatus): this {
    return this;
  }

  spanContext(): SpanContext {
    return {
      traceId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      spanId: "bbbbbbbbbbbbbbbb",
      traceFlags: 1
    };
  }

  updateName(_name: string): this {
    return this;
  }
}

function createRuntime(span: FakeSpan, shouldSample = true): NodeWideEventsRuntime {
  return {
    options: {
      serviceName: "payments",
      environment: "test",
      collectorUrl: "http://collector.test",
      sampleRate: 1,
      disabled: false,
      autoInstrument: {
        http: true,
        postgres: true,
        redis: true,
        fetch: true
      }
    },
    tracer: {
      startSpan() {
        return span;
      }
    },
    createParentContext() {
      return context.active();
    },
    shouldSample() {
      return shouldSample;
    }
  } as unknown as NodeWideEventsRuntime;
}

describe("createMiddleware", () => {
  it("finalizes a request only once across finish, close, and error", () => {
    const span = new FakeSpan();
    const middleware = createMiddleware(createRuntime(span));
    const listeners = new Map<string, () => void>();

    middleware(
      {
        method: "GET",
        url: "/checkout",
        headers: {}
      },
      {
        statusCode: 503,
        once(event: "finish" | "close" | "error", listener: () => void) {
          listeners.set(event, listener);
          return this;
        }
      },
      () => undefined
    );

    listeners.get("finish")?.();
    listeners.get("close")?.();
    listeners.get("error")?.();

    expect(span.endCalls).toBe(1);
    expect(span.attributes["http.status_code"]).toBe(503);
    expect(span.attributes["error"]).toBe(true);
  });

  it("passes through immediately when the runtime decides not to sample", () => {
    const span = new FakeSpan();
    const middleware = createMiddleware(createRuntime(span, false));
    let nextCalls = 0;

    middleware(
      {
        method: "GET",
        url: "/checkout",
        headers: {}
      },
      {
        once() {
          return this;
        }
      },
      () => {
        nextCalls += 1;
      }
    );

    expect(nextCalls).toBe(1);
    expect(span.endCalls).toBe(0);
  });
});
