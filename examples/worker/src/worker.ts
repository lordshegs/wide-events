import { WideEvents } from "@wide-events/sdk/edge";

interface Env {
  WIDE_EVENTS_COLLECTOR_URL: string;
  WIDE_EVENTS_SERVICE_NAME: string;
}

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const wideEvents = new WideEvents({
      serviceName: env.WIDE_EVENTS_SERVICE_NAME,
      collectorUrl: env.WIDE_EVENTS_COLLECTOR_URL,
      environment: "development",
    });

    const traceparent = request.headers.get("traceparent");
    if (traceparent) {
      wideEvents.setParentContext(traceparent);
    }

    wideEvents.annotate({
      main: true,
      "http.route": new URL(request.url).pathname,
      "http.request.method": request.method,
    });

    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    executionContext.waitUntil(wideEvents.flush());
    return response;
  },
};
