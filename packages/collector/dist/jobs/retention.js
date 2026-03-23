export class RetentionJob {
    store;
    timer;
    constructor(store) {
        this.store = store;
    }
    start() {
        this.timer = setInterval(() => {
            void this.store.runRetention().catch(() => undefined);
        }, 24 * 60 * 60 * 1_000);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
}
//# sourceMappingURL=retention.js.map