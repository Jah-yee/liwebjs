import { describe, it, expect, vi, beforeEach } from "vitest";
import { LiWebPresenceEngine } from "../presence";
import { createMockAdapter } from "./helpers/mock-adapter";
import { createMockConnection } from "./helpers/mock-connection";

function setup(options = {}) {
  const engine = new LiWebPresenceEngine(options);
  const mock = createMockAdapter();
  return { engine, mock };
}

describe("LiWebPresenceEngine — join", () => {
  it("creates an online record on join", () => {
    const { engine, mock } = setup();
    const conn = createMockConnection(mock.adapter);
    const record = engine._join(conn.id, { id: "u1", name: "Sumeet" });

    expect(record.status).toBe("online");
    expect(record.connId).toBe(conn.id);
    expect(record.user).toEqual({ id: "u1", name: "Sumeet" });
    expect(record.activity).toBeNull();
    expect(record.joinedAt).toBeInstanceOf(Date);
  });

  it("stores null user when no auth", () => {
    const { engine, mock } = setup();
    const conn = createMockConnection(mock.adapter);
    const record = engine._join(conn.id, null);
    expect(record.user).toBeNull();
  });
});

describe("LiWebPresenceEngine — leave", () => {
  it("marks record as offline on leave", () => {
    const { engine, mock } = setup({ offlineTTL: 60000 });
    const conn = createMockConnection(mock.adapter);
    engine._join(conn.id, null);
    const record = engine._leave(conn.id);

    expect(record?.status).toBe("offline");
    expect(record?.lastSeen).toBeInstanceOf(Date);
    expect(record?.activity).toBeNull();
  });

  it("returns undefined for unknown connId", () => {
    const { engine } = setup();
    expect(engine._leave("non-existent")).toBeUndefined();
  });

  it("deletes offline record after TTL", async () => {
    vi.useFakeTimers();
    const { engine, mock } = setup({ offlineTTL: 100 });
    const conn = createMockConnection(mock.adapter);
    engine._join(conn.id, null);
    engine._leave(conn.id);

    expect(engine.get(conn.id)).toBeDefined(); // still there

    vi.advanceTimersByTime(101);
    expect(engine.get(conn.id)).toBeUndefined(); // cleaned up

    vi.useRealTimers();
  });
});

describe("LiWebPresenceEngine — online / count", () => {
  it("online() returns only online records", () => {
    const { engine, mock } = setup({ offlineTTL: 60000 });
    const c1 = createMockConnection(mock.adapter);
    const c2 = createMockConnection(mock.adapter);
    const c3 = createMockConnection(mock.adapter);

    engine._join(c1.id, null);
    engine._join(c2.id, null);
    engine._join(c3.id, null);
    engine._leave(c1.id); // c1 goes offline

    const online = engine.online();
    expect(online).toHaveLength(2);
    expect(online.map(r => r.connId)).not.toContain(c1.id);
  });

  it("count() returns number of online users", () => {
    const { engine, mock } = setup();
    const c1 = createMockConnection(mock.adapter);
    const c2 = createMockConnection(mock.adapter);

    engine._join(c1.id, null);
    engine._join(c2.id, null);
    expect(engine.count()).toBe(2);
  });

  it("all() returns both online and offline records", () => {
    const { engine, mock } = setup({ offlineTTL: 60000 });
    const c1 = createMockConnection(mock.adapter);
    const c2 = createMockConnection(mock.adapter);

    engine._join(c1.id, null);
    engine._join(c2.id, null);
    engine._leave(c1.id);

    expect(engine.all()).toHaveLength(2);
  });
});

describe("LiWebPresenceEngine — lastSeen / isOnline", () => {
  it("lastSeen returns a date for known connId", () => {
    const { engine, mock } = setup();
    const conn = createMockConnection(mock.adapter);
    engine._join(conn.id, null);
    expect(engine.lastSeen(conn.id)).toBeInstanceOf(Date);
  });

  it("lastSeen returns undefined for unknown connId", () => {
    const { engine } = setup();
    expect(engine.lastSeen("unknown")).toBeUndefined();
  });

  it("isOnline returns true for connected user", () => {
    const { engine, mock } = setup();
    const conn = createMockConnection(mock.adapter);
    engine._join(conn.id, null);
    expect(engine.isOnline(conn.id)).toBe(true);
  });

  it("isOnline returns false after leave", () => {
    const { engine, mock } = setup({ offlineTTL: 60000 });
    const conn = createMockConnection(mock.adapter);
    engine._join(conn.id, null);
    engine._leave(conn.id);
    expect(engine.isOnline(conn.id)).toBe(false);
  });
});

describe("LiWebPresenceEngine — setActivity / withActivity", () => {
  it("sets activity for online user", () => {
    const { engine, mock } = setup();
    const conn = createMockConnection(mock.adapter);
    engine._join(conn.id, null);

    const record = engine.setActivity(conn.id, "typing");
    expect(record?.activity).toBe("typing");
  });

  it("clears activity when null passed", () => {
    const { engine, mock } = setup();
    const conn = createMockConnection(mock.adapter);
    engine._join(conn.id, null);
    engine.setActivity(conn.id, "typing");
    engine.setActivity(conn.id, null);
    expect(engine.get(conn.id)?.activity).toBeNull();
  });

  it("returns undefined for offline user", () => {
    const { engine, mock } = setup({ offlineTTL: 60000 });
    const conn = createMockConnection(mock.adapter);
    engine._join(conn.id, null);
    engine._leave(conn.id);
    expect(engine.setActivity(conn.id, "typing")).toBeUndefined();
  });

  it("withActivity returns users with matching activity", () => {
    const { engine, mock } = setup();
    const c1 = createMockConnection(mock.adapter);
    const c2 = createMockConnection(mock.adapter);
    const c3 = createMockConnection(mock.adapter);

    engine._join(c1.id, null);
    engine._join(c2.id, null);
    engine._join(c3.id, null);
    engine.setActivity(c1.id, "typing");
    engine.setActivity(c2.id, "typing");
    engine.setActivity(c3.id, "idle");

    expect(engine.withActivity("typing")).toHaveLength(2);
    expect(engine.withActivity("idle")).toHaveLength(1);
    expect(engine.withActivity("viewing")).toHaveLength(0);
  });
});

describe("LiWebPresenceEngine — snapshot", () => {
  it("returns plain objects of online users", () => {
    const { engine, mock } = setup({ offlineTTL: 60000 });
    const c1 = createMockConnection(mock.adapter);
    const c2 = createMockConnection(mock.adapter);

    engine._join(c1.id, { id: "u1" });
    engine._join(c2.id, { id: "u2" });
    engine._leave(c1.id); // offline — should not appear

    const snap = engine.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].connId).toBe(c2.id);
  });
});

describe("LiWebPresenceEngine — _destroy", () => {
  it("clears all records and timers without throwing", () => {
    const { engine, mock } = setup({ offlineTTL: 60000 });
    const conn = createMockConnection(mock.adapter);
    engine._join(conn.id, null);
    engine._leave(conn.id);

    expect(() => engine._destroy()).not.toThrow();
    expect(engine.all()).toHaveLength(0);
  });
});