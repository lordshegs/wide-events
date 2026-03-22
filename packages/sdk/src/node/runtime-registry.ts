import type { SpanExporter } from "@opentelemetry/sdk-trace-node";
import type { ResolvedWideEventsOptions } from "../shared/options.js";
import { NodeWideEventsRuntime } from "./runtime.js";

interface RuntimeSlot {
  key: string;
  references: number;
  runtime: NodeWideEventsRuntime;
}

interface RuntimeSnapshot {
  key: string;
  references: number;
}

interface RuntimeRegistryState {
  activeRuntimeSlot: RuntimeSlot | null;
  exporterIds: WeakMap<SpanExporter, number>;
  nextExporterId: number;
}

const runtimeRegistryStateKey = "__wideEventsNodeRuntimeRegistryState__" as const;

function getRuntimeRegistryState(): RuntimeRegistryState {
  const globalState = globalThis as typeof globalThis & {
    [runtimeRegistryStateKey]?: RuntimeRegistryState;
  };

  const existingState = globalState[runtimeRegistryStateKey];
  if (existingState) {
    return existingState;
  }

  const createdState: RuntimeRegistryState = {
    activeRuntimeSlot: null,
    exporterIds: new WeakMap<SpanExporter, number>(),
    nextExporterId: 1
  };
  globalState[runtimeRegistryStateKey] = createdState;
  return createdState;
}

export interface AcquiredNodeRuntime {
  release(): Promise<void>;
  runtime: NodeWideEventsRuntime;
}

export function acquireNodeRuntime(
  options: ResolvedWideEventsOptions
): AcquiredNodeRuntime {
  const state = getRuntimeRegistryState();
  const key = buildRuntimeKey(options);

  if (state.activeRuntimeSlot) {
    if (state.activeRuntimeSlot.key !== key) {
      throw new Error(
        "WideEvents already has an active Node runtime with different options"
      );
    }

    state.activeRuntimeSlot.references += 1;
    return {
      runtime: state.activeRuntimeSlot.runtime,
      release: async () => {
        await releaseNodeRuntime(key);
      }
    };
  }

  const runtime = new NodeWideEventsRuntime(options);
  state.activeRuntimeSlot = {
    key,
    references: 1,
    runtime
  };

  return {
    runtime,
    release: async () => {
      await releaseNodeRuntime(key);
    }
  };
}

async function releaseNodeRuntime(expectedKey: string): Promise<void> {
  const state = getRuntimeRegistryState();
  if (!state.activeRuntimeSlot || state.activeRuntimeSlot.key !== expectedKey) {
    return;
  }

  state.activeRuntimeSlot.references -= 1;
  if (state.activeRuntimeSlot.references > 0) {
    return;
  }

  const { runtime } = state.activeRuntimeSlot;
  state.activeRuntimeSlot = null;
  await runtime.shutdown();
}

function buildRuntimeKey(options: ResolvedWideEventsOptions): string {
  return JSON.stringify({
    autoInstrument: options.autoInstrument,
    collectorUrl: options.collectorUrl,
    disabled: options.disabled,
    environment: options.environment,
    sampleRate: options.sampleRate,
    serviceName: options.serviceName,
    traceExporterId: options.traceExporter
      ? getTraceExporterId(options.traceExporter)
      : null
  });
}

function getTraceExporterId(traceExporter: SpanExporter): number {
  const state = getRuntimeRegistryState();
  const existingId = state.exporterIds.get(traceExporter);
  if (existingId) {
    return existingId;
  }

  const id = state.nextExporterId;
  state.nextExporterId += 1;
  state.exporterIds.set(traceExporter, id);
  return id;
}

export function getRuntimeRegistrySnapshotForTests(): RuntimeSnapshot | null {
  const state = getRuntimeRegistryState();
  if (!state.activeRuntimeSlot) {
    return null;
  }

  return {
    key: state.activeRuntimeSlot.key,
    references: state.activeRuntimeSlot.references
  };
}

export async function resetNodeRuntimeRegistryForTests(): Promise<void> {
  const state = getRuntimeRegistryState();
  if (!state.activeRuntimeSlot) {
    return;
  }

  const { runtime } = state.activeRuntimeSlot;
  state.activeRuntimeSlot = null;
  await runtime.shutdown();
}
