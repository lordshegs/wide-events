import type { ResolvedWideEventsOptions } from "../shared/options.js";
import { NodeWideEventsRuntime } from "./runtime.js";
interface RuntimeSnapshot {
    key: string;
    references: number;
}
export interface AcquiredNodeRuntime {
    release(): Promise<void>;
    runtime: NodeWideEventsRuntime;
}
export declare function acquireNodeRuntime(options: ResolvedWideEventsOptions): AcquiredNodeRuntime;
export declare function getRuntimeRegistrySnapshotForTests(): RuntimeSnapshot | null;
export declare function resetNodeRuntimeRegistryForTests(): Promise<void>;
export {};
//# sourceMappingURL=runtime-registry.d.ts.map