import { describe, it, expect, vi } from "vitest";
import { createLiWebServer } from "../server";
import { createMockAdapter } from "./helpers/mock-adapter";
import { createMockConnection } from "./helpers/mock-connection";

describe("server auth — disabled", () => {
  it("fires connection immediately when auth not configured", () => {
    const { adapter, simulateConnection } = createMockAdapter();
    const liweb = createLiWebServer({}, { adapter });

    const handler = vi.fn();
    liweb.on("connection", handler);

    simulateConnection(createMockConnection(adapter));
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe("server auth — enabled", () => {
  function setup() {
    const mock = createMockAdapter();
    const liweb = createLiWebServer(
      {},
      { adapter: mock.adapter, auth: { secret: "test-secret", timeout: 100 } },
    );
    return { ...mock, liweb };
  }

  it("does not fire connection before auth", () => {
    const { adapter, simulateConnection, liweb } = setup();
    const handler = vi.fn();
    liweb.on("connection", handler);

    simulateConnection(createMockConnection(adapter));
    expect(handler).not.toHaveBeenCalled();
  });

  it("fires connection after successful auth", () => {
    const { adapter, simulateConnection, simulateMessage, liweb } = setup();
    const handler = vi.fn();
    liweb.on("connection", handler);

    const conn = createMockConnection(adapter);
    simulateConnection(conn);
    simulateMessage(conn, "__auth", { secret: "test-secret" });

    expect(handler).toHaveBeenCalledOnce();
  });

  it("sends auth:success on valid auth", () => {
    const { adapter, simulateConnection, simulateMessage, sentBy } = setup();

    const conn = createMockConnection(adapter);
    simulateConnection(conn);
    simulateMessage(conn, "__auth", { secret: "test-secret" });

    const messages = sentBy(conn);
    expect(messages.some((m) => m.event === "auth:success")).toBe(true);
  });

  it("sends auth:error and closes on wrong secret", () => {
    const { adapter, simulateConnection, simulateMessage, sentBy } = setup();

    const conn = createMockConnection(adapter);
    simulateConnection(conn);
    simulateMessage(conn, "__auth", { secret: "wrong" });

    expect(sentBy(conn).some((m) => m.event === "auth:error")).toBe(true);
  });

  it("blocks messages from unauthenticated connections", () => {
    const { adapter, simulateConnection, simulateMessage, sentBy, liweb } =
      setup();

    const handler = vi.fn();
    liweb.handle("message", handler);

    const conn = createMockConnection(adapter);
    simulateConnection(conn);
    simulateMessage(conn, "message", { text: "hi" }); // no auth yet

    expect(handler).not.toHaveBeenCalled();
    expect(sentBy(conn).some((m) => m.event === "auth:error")).toBe(true);
  });

  it("populates ctx.user after auth", () => {
    const { adapter, simulateConnection, simulateMessage, liweb } = setup();

    let capturedUser: unknown;
    liweb.on("connection", (ctx) => {
      capturedUser = ctx.user;
    });

    const conn = createMockConnection(adapter);
    simulateConnection(conn);
    simulateMessage(conn, "__auth", {
      secret: "test-secret",
      secure: { id: "u1", name: "Sumeet" },
    });

    expect(capturedUser).toEqual({ id: "u1", name: "Sumeet" });
  });

  it("fires auth:error lifecycle on wrong secret", () => {
    const { adapter, simulateConnection, simulateMessage, liweb } = setup();

    const handler = vi.fn();
    liweb.on("auth:error", handler);

    const conn = createMockConnection(adapter);
    simulateConnection(conn);
    simulateMessage(conn, "__auth", { secret: "wrong" });

    expect(handler).toHaveBeenCalledOnce();
  });
});