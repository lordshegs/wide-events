export declare class SerializedExecutor {
    private tail;
    enqueue<T>(task: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=serialized-executor.d.ts.map