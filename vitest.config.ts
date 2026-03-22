import { defineConfig } from "vitest/config";

export default defineConfig({
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
