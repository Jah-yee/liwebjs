import { describe, it, expect, vi } from "vitest";
import { wsAdapter } from "../adapters/ws/index";

describe("wsAdapter", () => {
  it("throws if server does not have an 'on' method", () => {
    const adapter = wsAdapter();
    expect(() =>
      adapter.attach(null, vi.fn(), vi.fn(), vi.fn())
    ).toThrow("wsAdapter requires a Node HTTP server");
  });

  it("throws if server is a primitive", () => {
    const adapter = wsAdapter();
    expect(() =>
      adapter.attach("not-a-server", vi.fn(), vi.fn(), vi.fn())
    ).toThrow();
  });

  it("accepts options without throwing", () => {
    expect(() =>
      wsAdapter({ pingInterval: 5000, pingTimeout: 2000 })
    ).not.toThrow();
  });

  it("uses default options when none provided", () => {
    expect(() => wsAdapter()).not.toThrow();
  });
});