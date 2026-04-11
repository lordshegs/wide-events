import { describe, expect, it } from "vitest";
import { SerializedExecutor } from "./serialized-executor";

describe("SerializedExecutor", () => {
  it("runs queued tasks sequentially", async () => {
    const executor = new SerializedExecutor();
    const executionOrder: string[] = [];
    let releaseFirstTask: (() => void) | undefined;
    const firstTaskGate = new Promise<void>((resolve) => {
      releaseFirstTask = resolve;
    });

    const firstTask = executor.enqueue(async () => {
      executionOrder.push("first:start");
      await firstTaskGate;
      executionOrder.push("first:end");
      return "first";
    });

    const secondTask = executor.enqueue(async () => {
      executionOrder.push("second");
      return "second";
    });

    await Promise.resolve();
    expect(executionOrder).toEqual(["first:start"]);
    releaseFirstTask?.();

    await expect(firstTask).resolves.toBe("first");
    await expect(secondTask).resolves.toBe("second");
    expect(executionOrder).toEqual(["first:start", "first:end", "second"]);
  });

  it("continues draining tasks after a rejection", async () => {
    const executor = new SerializedExecutor();

    const failingTask = executor.enqueue(async () => {
      throw new Error("boom");
    });
    const succeedingTask = executor.enqueue(async () => "ok");

    await expect(failingTask).rejects.toThrow("boom");
    await expect(succeedingTask).resolves.toBe("ok");
  });
});
