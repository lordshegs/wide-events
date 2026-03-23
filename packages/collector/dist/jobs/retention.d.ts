import type { CollectorStore } from "../storage/store.js";
export declare class RetentionJob {
    private readonly store;
    private timer;
    constructor(store: CollectorStore);
    start(): void;
    stop(): void;
}
//# sourceMappingURL=retention.d.ts.map