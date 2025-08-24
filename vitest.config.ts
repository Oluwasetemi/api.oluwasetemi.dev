import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Run tests sequentially to avoid database conflicts
    pool: "forks",
    root: path.resolve(fileURLToPath(import.meta.url), "../src"),
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Clean up test files after each test
    teardownTimeout: 10000,
    testTimeout: 60000,
    hookTimeout: 60000,
    exclude: ["dist/**/*", "node_modules/**/*", "coverage/**/*", ".git/**/*", "types.ts", "src/db/**/*", "*.config.ts"],
    coverage: {
      exclude: [
        "dist/**/*",
        "node_modules/**/*",
        "coverage/**/*",
        ".git/**/*",
        "types.ts",
        "db/**/*",
        "*.config.ts",
        "src/db/migrations/**/*",
        "src/db/seed.ts",
        "src/index.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/__tests__/**",
      ],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "json-summary"],
      reportOnFailure: true,
      reportsDirectory: "./coverage",
    },
  },
});
