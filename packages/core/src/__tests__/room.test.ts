import { describe, it, expect, vi } from "vitest";
import { LiWebRoom } from "../room";
import { createMockConnection } from "./helpers/mock-connection";
import { createMockAdapter } from "./helpers/mock-adapter";

function setup() {
  const mock = createMockAdapter();
  const room = new LiWebRoom("chat", "general");
  return { room, mock };
}

describe("LiWebRoom — membership", () => {
  it("joins a connection", () => {
    const { room, mock } = setup();
    const conn = createMockConnection(mock.adapter);
    room.join(conn);
    expect(room.size).toBe(1);
    expect(room.has(conn)).toBe(true);
  });

  it("leaves a connection", () => {
    const { room, mock } = setup();
    const conn = createMockConnection(mock.adapter);
    room.join(conn);
    room.leave(conn);
    expect(room.size).toBe(0);
    expect(room.has(conn)).toBe(false);
  });

  it("tracks multiple members", () => {
    const { room, mock } = setup();
    const c1 = createMockConnection(mock.adapter);
    const c2 = createMockConnection(mock.adapter);
    const c3 = createMockConnection(mock.adapter);
    room.join(c1);
    room.join(c2);
    room.join(c3);
    expect(room.size).toBe(3);
  });

  it("ignores duplicate join", () => {
    const { room, mock } = setup();
    const conn = createMockConnection(mock.adapter);
    room.join(conn);
    room.join(conn);
    expect(room.size).toBe(1);
  });

  it("leave on non-member is a no-op", () => {
    const { room, mock } = setup();
    const conn = createMockConnection(mock.adapter);
    expect(() => room.leave(conn)).not.toThrow();
  });
});

describe("LiWebRoom — broadcasting", () => {
  it("emit sends to all members", () => {
    const { room, mock } = setup();
    const c1 = createMockConnection(mock.adapter);
    const c2 = createMockConnection(mock.adapter);
    room.join(c1);
    room.join(c2);

    room.emit("ping", { ts: 1 });

    expect(mock.sentBy(c1)).toEqual([{ event: "ping", payload: { ts: 1 } }]);
    expect(mock.sentBy(c2)).toEqual([{ event: "ping", payload: { ts: 1 } }]);
  });

  it("emitExcept skips the excluded connection", () => {
    const { room, mock } = setup();
    const c1 = createMockConnection(mock.adapter);
    const c2 = createMockConnection(mock.adapter);
    const c3 = createMockConnection(mock.adapter);
    room.join(c1);
    room.join(c2);
    room.join(c3);

    room.emitExcept(c1.id, "msg", { text: "hi" });

    expect(mock.sentBy(c1)).toHaveLength(0);
    expect(mock.sentBy(c2)).toHaveLength(1);
    expect(mock.sentBy(c3)).toHaveLength(1);
  });

  it("emitTo sends only to target connection", () => {
    const { room, mock } = setup();
    const c1 = createMockConnection(mock.adapter);
    const c2 = createMockConnection(mock.adapter);
    room.join(c1);
    room.join(c2);

    room.emitTo(c1.id, "dm", { text: "just you" });

    expect(mock.sentBy(c1)).toHaveLength(1);
    expect(mock.sentBy(c2)).toHaveLength(0);
  });

  it("emitTo unknown id is a no-op", () => {
    const { room, mock } = setup();
    const conn = createMockConnection(mock.adapter);
    room.join(conn);
    expect(() => room.emitTo("non-existent", "ping", {})).not.toThrow();
  });

  it("emit on empty room is a no-op", () => {
    const { room } = setup();
    expect(() => room.emit("ping", {})).not.toThrow();
  });
});