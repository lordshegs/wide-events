export async function postJson(
  fetchImpl: typeof fetch,
  url: string,
  body: unknown
): Promise<void> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Telemetry export failed (${response.status}): ${payload}`);
  }
}
