import { defineConfig } from "vitest/config";
import path from "path";

// Vitest uses this instead of vite.config.ts (kept separate so the production
// build config stays untouched). Default env is node for pure-logic tests;
// suites that need a DOM/localStorage opt in per-file via
// `// @vitest-environment jsdom`.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    // src/** for unit tests; root-level *.test.ts for the server integration suite.
    include: ["src/**/*.{test,spec}.ts", "*.{test,spec}.ts"],
  },
});
