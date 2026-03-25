import { describe, it, expect, vi } from "vitest";
import { createLiWebServer } from "../server";
import { createMockAdapter } from "./helpers/mock-adapter";
import { createMockConnection } from "./helpers/mock-connection";

describe("createLiWebServer — lifecycle events", () => {
  it("fires connection handler when client connects", () => {
    const { adapter, simulateConnection } = createMockAdapter();
    const liweb = createLiWebServer({}, { adapter });

    const handler = vi.fn();
    liweb.on("connection", handler);

    const conn = createMockConnection(adapter);
    simulateConnection(conn);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].connection.id).toBe(conn.id);
    expect(handler.mock.calls[0][0].event).toBe("connection");
  });

  it("fires disconnect handler when client disconnects", () => {
    const { adapter, simulateConnection, simulateDisconnect } =
      createMockAdapter();
    const liweb = createLiWebServer({}, { adapter });

    const handler = vi.fn();
    liweb.on("disconnect", handler);

    const conn = createMockConnection(adapter);
    simulateConnection(conn);
    simulateDisconnect(conn);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].event).toBe("disconnect");
  });

  it("supports multiple handlers for same lifecycle event", () => {
    const { adapter, simulateConnection } = createMockAdapter();
    const liweb = createLiWebServer({}, { adapter });

    const h1 = vi.fn();
    const h2 = vi.fn();
    liweb.on("connection", h1);
    liweb.on("connection", h2);

    simulateConnection(createMockConnection(adapter));

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });
});

describe("createLiWebServer — event routing (.handle)", () => {
  it("routes incoming event to correct handler", () => {
    const { adapter, simulateConnection, simulateMessage } =
      createMockAdapter();
    const liweb = createLiWebServer({}, { adapter });

    const pingHandler = vi.fn();
    liweb.handle("ping", pingHandler);

    const conn = createMockConnection(adapter);
    simulateConnection(conn);
    simulateMessage(conn, "ping", { ts: 123 });

    expect(pingHandler).toHaveBeenCalledOnce();
    expect(pingHandler.mock.calls[0][0].event).toBe("ping");
    expect(pingHandler.mock.calls[0][0].payload).toEqual({ ts: 123 });
  });

  it("does not fire handler for different event", () => {
    const { adapter, simulateConnection, simulateMessage } =
      createMockAdapter();
    const liweb = createLiWebServer({}, { adapter });

    const pingHandler = vi.fn();
    liweb.handle("ping", pingHandler);

    const conn = createMockConnection(adapter);
    simulateConnection(conn);
    simulateMessage(conn, "message", { text: "hello" }); // different event

    expect(pingHandler).not.toHaveBeenCalled();
  });

  it("supports multiple handlers for same event", () => {
    const { adapter, simulateConnection, simulateMessage } =
      createMockAdapter();
    const liweb = createLiWebServer({}, { adapter });

    const h1 = vi.fn();
    const h2 = vi.fn();
    liweb.handle("ping", h1);
    liweb.handle("ping", h2);

    const conn = createMockConnection(adapter);
    simulateConnection(conn);
    simulateMessage(conn, "ping", null);

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("ctx.send() inside handler sends back to same connection", () => {
    const { adapter, simulateConnection, simulateMessage, sentBy } =
      createMockAdapter();
    const liweb = createLiWebServer({}, { adapter });

    liweb.handle("ping", (ctx) => {
      ctx.send("pong", { ok: true });
    });

    const conn = createMockConnection(adapter);
    simulateConnection(conn);
    simulateMessage(conn, "ping", {});

    const messages = sentBy(conn);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({ event: "pong", payload: { ok: true } });
  });

  it("ctx carries correct connection reference", () => {
    const { adapter, simulateConnection, simulateMessage } =
      createMockAdapter();
    const liweb = createLiWebServer({}, { adapter });

    let capturedCtx: any;
    liweb.handle("ping", (ctx) => { capturedCtx = ctx; });

    const conn = createMockConnection(adapter);
    simulateConnection(conn);
    simulateMessage(conn, "ping", "test-payload");

    expect(capturedCtx.connection).toBe(conn);
    expect(capturedCtx.payload).toBe("test-payload");
  });

  it("silently ignores events with no registered handler", () => {
    const { adapter, simulateConnection, simulateMessage } =
      createMockAdapter();
    createLiWebServer({}, { adapter });

    const conn = createMockConnection(adapter);
    simulateConnection(conn);

    // Should not throw
    expect(() =>
      simulateMessage(conn, "unregistered-event", {}),
    ).not.toThrow();
  });
});