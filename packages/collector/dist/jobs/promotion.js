export class PromotionJob {
    store;
    config;
    timer;
    currentRun = null;
    running = false;
    rerunRequested = false;
    constructor(store, config) {
        this.store = store;
        this.config = config;
    }
    start() {
        this.timer = setInterval(() => {
            void this.requestCycle();
        }, this.config.promotionIntervalMs);
    }
    async requestCycle() {
        if (this.running) {
            this.rerunRequested = true;
            return;
        }
        this.running = true;
        this.currentRun = (async () => {
            try {
                do {
                    this.rerunRequested = false;
                    await this.store.runPromotionCycle();
                } while (this.rerunRequested);
            }
            finally {
                this.running = false;
                this.currentRun = null;
            }
        })();
        await this.currentRun;
    }
    async stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        if (this.currentRun) {
            await this.currentRun;
        }
    }
}
//# sourceMappingURL=promotion.js.map