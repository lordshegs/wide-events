import type { ExecutionContext } from "@cloudflare/workers-types";
import { WideEvents } from "@wide-events/sdk/edge";

interface Env {
  WIDE_EVENTS_COLLECTOR_URL: string;
  WIDE_EVENTS_ENVIRONMENT?: string;
  WIDE_EVENTS_SERVICE_NAME: string;
}

export function handleWorkerRequest(
  request: Request,
  env: Env,
  executionContext: ExecutionContext
): Response {
  const wideEvents = new WideEvents({
    serviceName: env.WIDE_EVENTS_SERVICE_NAME,
    collectorUrl: env.WIDE_EVENTS_COLLECTOR_URL,
    environment: env.WIDE_EVENTS_ENVIRONMENT ?? "development"
  });

  const traceparent = request.headers.get("traceparent");
  if (traceparent) {
    wideEvents.setParentContext(traceparent);
  }

  wideEvents.annotate({
    main: true,
    "http.route": new URL(request.url).pathname,
    "http.request.method": request.method
  });

  const response = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });

  executionContext.waitUntil(wideEvents.flush());
  return response;
}

export default {
  fetch: handleWorkerRequest
};
