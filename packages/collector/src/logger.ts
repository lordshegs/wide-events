export interface CollectorLogger {
  info(bindings: Record<string, unknown>, message: string): void;
  warn(bindings: Record<string, unknown>, message: string): void;
  error(bindings: Record<string, unknown>, message: string): void;
}

export const noopCollectorLogger: CollectorLogger = {
  info() {},
  warn() {},
  error() {}
};
