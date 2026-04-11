export class SerializedExecutor {
    tail = Promise.resolve();
    enqueue(task) {
        const result = this.tail.then(task, task);
        this.tail = result.then(() => undefined, () => undefined);
        return result;
    }
}
//# sourceMappingURL=serialized-executor.js.map