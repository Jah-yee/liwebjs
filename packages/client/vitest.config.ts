import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom", // browser-like environment for WebSocket
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});