import { WideEvents } from "@wide-events/sdk";

const wideEvents = new WideEvents({
  serviceName: process.env.WIDE_EVENTS_SERVICE_NAME ?? "example-lambda",
  environment: process.env.WIDE_EVENTS_ENVIRONMENT ?? "development",
  collectorUrl: process.env.WIDE_EVENTS_COLLECTOR_URL ?? "http://localhost:4318"
});

export const handler = wideEvents.wrapHandler(async () => {
  wideEvents.annotate({
    main: true,
    "http.route": "/lambda"
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true })
  };
});
