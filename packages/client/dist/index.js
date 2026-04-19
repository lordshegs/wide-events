export class WideEventsClient {
    baseUrl;
    fetchImpl;
    constructor(options) {
        this.baseUrl = options.url.replace(/\/$/u, "");
        this.fetchImpl = options.fetchImpl ?? fetch;
    }
    async query(request) {
        return await this.postJson("/query", request);
    }
    async sql(sql) {
        return await this.postJson("/sql", { sql });
    }
    async getColumns() {
        const response = await this.getJson("/columns");
        return response.columns;
    }
    async getTrace(traceId) {
        return await this.getJson(`/trace/${encodeURIComponent(traceId)}`);
    }
    async getJson(path) {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`);
        return await readJsonResponse(response);
    }
    async postJson(path, body) {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify(body)
        });
        return await readJsonResponse(response);
    }
}
async function readJsonResponse(response) {
    if (!response.ok) {
        const body = await response.text();
        const payload = tryParseJson(body);
        const message = payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
            ? payload.error
            : body
                ? body
                : `HTTP ${response.status}`;
        throw new Error(message);
    }
    return (await response.json());
}
function tryParseJson(value) {
    if (!value) {
        return null;
    }
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=index.js.map