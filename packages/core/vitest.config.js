import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    extensions: [".ts", ".js"],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/__tests__/**"],
    },
  },
});