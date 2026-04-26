import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLiWebClient } from "../index";

// ── Mock WebSocket ────────────────────────────────────────────────────────────

type WsEvent = "open" | "message" | "close";

class MockWebSocket {
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  sent: string[] = [];

  private listeners = new Map<WsEvent, ((...args: unknown[]) => void)[]>();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.lastInstance = this;

    // Auto-trigger open on next tick
    setTimeout(() => this.trigger("open"), 0);
  }

  static lastInstance: MockWebSocket;

  addEventListener(event: WsEvent, handler: (...args: unknown[]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(handler);
  }

  trigger(event: WsEvent, ...args: unknown[]) {
    const handlers = this.listeners.get(event) ?? [];
    for (const h of handlers) h(...args);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.trigger("close");
  }
}

// Inject mock into global scope
beforeEach(() => {
  (global as any).WebSocket = MockWebSocket;
});

afterEach(() => {
  delete (global as any).WebSocket;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("createLiWebClient — connection lifecycle", () => {
  it("calls connect handler when WebSocket opens", async () => {
    const client = createLiWebClient("ws://localhost:3001");
    const handler = vi.fn();
    client.on("connect", handler);

    await new Promise((r) => setTimeout(r, 10));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("calls disconnect handler when WebSocket closes", async () => {
    const client = createLiWebClient("ws://localhost:3001", { reconnect: false });
    const handler = vi.fn();
    client.on("disconnect", handler);

    await new Promise((r) => setTimeout(r, 10));
    MockWebSocket.lastInstance.close();

    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not reconnect when manualClose via disconnect()", async () => {
    const client = createLiWebClient("ws://localhost:3001", { reconnect: true });
    await new Promise((r) => setTimeout(r, 10));

    const instanceBefore = MockWebSocket.lastInstance;
    client.disconnect();

    await new Promise((r) => setTimeout(r, 50));
    expect(MockWebSocket.lastInstance).toBe(instanceBefore);
  });
});

describe("createLiWebClient — emit", () => {
  it("sends serialized event + payload over WebSocket", async () => {
    const client = createLiWebClient("ws://localhost:3001");
    await new Promise((r) => setTimeout(r, 10));

    client.emit("ping", { ts: 123 });

    const sent = MockWebSocket.lastInstance.sent;
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0])).toEqual({ event: "ping", payload: { ts: 123 } });
  });

  it("does not throw when emitting before connection open", () => {
    const client = createLiWebClient("ws://localhost:3001");
    MockWebSocket.lastInstance.readyState = 0; // CONNECTING

    expect(() => client.emit("ping", {})).not.toThrow();
  });

  it("does not send when WebSocket is closed", async () => {
    const client = createLiWebClient("ws://localhost:3001", { reconnect: false });
    await new Promise((r) => setTimeout(r, 10));

    client.disconnect();
    client.emit("ping", {});

    // Only the pre-disconnect sends should exist (none in this case)
    expect(MockWebSocket.lastInstance.sent).toHaveLength(0);
  });
});

describe("createLiWebClient — handle", () => {
  it("fires handler when matching event received from server", async () => {
    const client = createLiWebClient("ws://localhost:3001");
    await new Promise((r) => setTimeout(r, 10));

    const handler = vi.fn();
    client.handle("message", handler);

    const msg = JSON.stringify({ event: "message", payload: { text: "hi" } });
    MockWebSocket.lastInstance.trigger("message", { data: msg });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ text: "hi" });
  });

  it("does not fire handler for different event", async () => {
    const client = createLiWebClient("ws://localhost:3001");
    await new Promise((r) => setTimeout(r, 10));

    const handler = vi.fn();
    client.handle("message", handler);

    const msg = JSON.stringify({ event: "other", payload: {} });
    MockWebSocket.lastInstance.trigger("message", { data: msg });

    expect(handler).not.toHaveBeenCalled();
  });

  it("supports multiple handlers for same event", async () => {
    const client = createLiWebClient("ws://localhost:3001");
    await new Promise((r) => setTimeout(r, 10));

    const h1 = vi.fn();
    const h2 = vi.fn();
    client.handle("ping", h1);
    client.handle("ping", h2);

    const msg = JSON.stringify({ event: "ping", payload: null });
    MockWebSocket.lastInstance.trigger("message", { data: msg });

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("ignores malformed JSON messages without throwing", async () => {
    const client = createLiWebClient("ws://localhost:3001");
    await new Promise((r) => setTimeout(r, 10));

    expect(() =>
      MockWebSocket.lastInstance.trigger("message", { data: "not-json{{" })
    ).not.toThrow();
  });

  it("ignores messages without event field", async () => {
    const client = createLiWebClient("ws://localhost:3001");
    await new Promise((r) => setTimeout(r, 10));

    const handler = vi.fn();
    client.handle("ping", handler);

    const msg = JSON.stringify({ noEvent: true });
    MockWebSocket.lastInstance.trigger("message", { data: msg });

    expect(handler).not.toHaveBeenCalled();
  });

  it("defaults payload to null when missing", async () => {
    const client = createLiWebClient("ws://localhost:3001");
    await new Promise((r) => setTimeout(r, 10));

    const handler = vi.fn();
    client.handle("ping", handler);

    const msg = JSON.stringify({ event: "ping" }); // no payload field
    MockWebSocket.lastInstance.trigger("message", { data: msg });

    expect(handler).toHaveBeenCalledWith(null);
  });
});

describe("createLiWebClient — auth", () => {
  it("auto-sends auth on connect when options.auth provided", async () => {
    createLiWebClient("ws://localhost:3001", {
      auth: { secret: "mysecret", secure: { id: "u1" } },
    });
    await new Promise((r) => setTimeout(r, 10));

    const sent = MockWebSocket.lastInstance.sent;
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0])).toEqual({
      event: "__auth",
      payload: { secret: "mysecret", secure: { id: "u1" } },
    });
  });

  it("manual auth() sends __auth event", async () => {
    const client = createLiWebClient("ws://localhost:3001");
    await new Promise((r) => setTimeout(r, 10));

    client.auth({ secret: "tok123", secure: { role: "admin" } });

    const sent = MockWebSocket.lastInstance.sent;
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0])).toEqual({
      event: "__auth",
      payload: { secret: "tok123", secure: { role: "admin" } },
    });
  });

  it("manual auth() without secure sends only secret", async () => {
    const client = createLiWebClient("ws://localhost:3001");
    await new Promise((r) => setTimeout(r, 10));

    client.auth({ secret: "tok123" });

    const sent = MockWebSocket.lastInstance.sent;
    expect(JSON.parse(sent[0]).payload).toEqual({
      secret: "tok123",
      secure: undefined,
    });
  });
});