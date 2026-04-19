export function registerHealthRoute(app) {
    app.get("/health", () => ({
        ok: true
    }));
}
//# sourceMappingURL=health.js.map