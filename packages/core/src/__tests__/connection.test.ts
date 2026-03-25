import { describe, it, expect, vi } from "vitest";
import { LiWebConnection } from "../connection";
import type { Adapter } from "../adapters/adapter.interface";

function makeFakeAdapter(): Adapter {
  return {
    attach: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
  };
}

describe("LiWebConnection", () => {
  it("stores id and meta on construction", () => {
    const adapter = makeFakeAdapter();
    const conn = new LiWebConnection(
      "abc-123",
      { headers: {}, ip: "127.0.0.1", protocol: "ws" },
      adapter,
    );

    expect(conn.id).toBe("abc-123");
    expect(conn.meta.ip).toBe("127.0.0.1");
    expect(conn.meta.protocol).toBe("ws");
  });

  it("delegates send() to adapter", () => {
    const adapter = makeFakeAdapter();
    const conn = new LiWebConnection(
      "abc-123",
      { headers: {}, protocol: "ws" },
      adapter,
    );

    conn.send("ping", { msg: "hello" });

    expect(adapter.send).toHaveBeenCalledOnce();
    expect(adapter.send).toHaveBeenCalledWith(conn, "ping", { msg: "hello" });
  });

  it("delegates close() to adapter", () => {
    const adapter = makeFakeAdapter();
    const conn = new LiWebConnection(
      "abc-123",
      { headers: {}, protocol: "ws" },
      adapter,
    );

    conn.close();

    expect(adapter.close).toHaveBeenCalledOnce();
    expect(adapter.close).toHaveBeenCalledWith(conn);
  });

  it("id is readonly", () => {
    const adapter = makeFakeAdapter();
    const conn = new LiWebConnection("abc-123", { headers: {}, protocol: "ws" }, adapter);

    // TypeScript prevents this at compile time, but guard at runtime too
    expect(() => {
      (conn as any).id = "hacked";
    }).toThrow();
  });
});