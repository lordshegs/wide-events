export interface CollectorLogger {
    info(bindings: Record<string, unknown>, message: string): void;
    warn(bindings: Record<string, unknown>, message: string): void;
    error(bindings: Record<string, unknown>, message: string): void;
}
export declare const noopCollectorLogger: CollectorLogger;
//# sourceMappingURL=logger.d.ts.map