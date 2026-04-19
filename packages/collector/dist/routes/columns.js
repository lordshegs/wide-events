export function registerColumnRoutes(app, dependencies) {
    app.get("/columns", () => ({
        columns: dependencies.catalog.listColumns(dependencies.schema)
    }));
}
//# sourceMappingURL=columns.js.map