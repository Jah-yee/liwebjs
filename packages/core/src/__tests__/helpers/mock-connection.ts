import { LiWebConnection } from "../../connection";
import type { Adapter } from "../../adapters/adapter.interface";

let counter = 0;

/**
 * Creates a LiWebConnection with a fake adapter for testing.
 * Each call gives a unique deterministic id.
 */
export function createMockConnection(adapter: Adapter): LiWebConnection {
  counter++;
  return new LiWebConnection(
    `test-conn-${counter}`,
    {
      headers: { host: "localhost" },
      ip: "127.0.0.1",
      protocol: "ws",
    },
    adapter,
  );
}

/** Reset counter between test files if needed */
export function resetCounter() {
  counter = 0;
}