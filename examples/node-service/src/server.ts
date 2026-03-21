import { createServer } from "node:http";
import { WideEvents } from "@wide-events/sdk";

const wideEvents = new WideEvents({
  serviceName: process.env.WIDE_EVENTS_SERVICE_NAME ?? "node-service",
  environment: process.env.WIDE_EVENTS_ENVIRONMENT ?? "development",
  collectorUrl: process.env.WIDE_EVENTS_COLLECTOR_URL ?? "http://localhost:4318"
});

const middleware = wideEvents.middleware();
const server = createServer((request, response) => {
  middleware(
    {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [
          key,
          Array.isArray(value) ? value : value ?? undefined
        ])
      )
    },
    response,
    () => {
      wideEvents.annotate({
        main: true,
        "http.route": request.url ?? "/"
      });

      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ ok: true }));
    }
  );
});

server.listen(3000, "0.0.0.0");
