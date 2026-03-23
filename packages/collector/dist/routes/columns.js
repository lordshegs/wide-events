export function registerColumnRoutes(app, dependencies) {
    app.get("/columns", () => ({
        columns: dependencies.schema.listColumns()
    }));
}
//# sourceMappingURL=columns.js.map