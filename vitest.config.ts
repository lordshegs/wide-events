import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@wide-events/sdk/edge",
        replacement: resolve(__dirname, "packages/sdk/src/edge/index.ts")
      },
      {
        find: "@wide-events/sdk",
        replacement: resolve(__dirname, "packages/sdk/src/node/index.ts")
      }
    ]
  },
  test: {
    environment: "node",
    // The Node SDK intentionally keeps a process-global runtime registry.
    // Running files in parallel creates artificial cross-suite conflicts.
    fileParallelism: false,
    include: [
      "packages/**/*.test.ts",
      "examples/**/*.test.ts",
      "test/**/*.test.ts"
    ],
    exclude: [
      "**/dist/**",
      "**/node_modules/**"
    ]
  }
});
