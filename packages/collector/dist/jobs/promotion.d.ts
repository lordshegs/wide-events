import type { CollectorConfig } from "../config.js";
import type { CollectorStore } from "../storage/store.js";
export declare class PromotionJob {
    private readonly store;
    private readonly config;
    private timer;
    private currentRun;
    private running;
    private rerunRequested;
    constructor(store: CollectorStore, config: CollectorConfig);
    start(): void;
    requestCycle(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=promotion.d.ts.map