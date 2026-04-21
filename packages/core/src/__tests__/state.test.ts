import { describe, it, expect } from "vitest";
import { LiWebState } from "../state";

describe("LiWebState — get / set / has / delete / clear", () => {
  it("returns undefined for missing key", () => {
    const state = new LiWebState();
    expect(state.get("missing")).toBeUndefined();
  });

  it("sets and gets a value", () => {
    const state = new LiWebState();
    state.set("name", "sumeet");
    expect(state.get("name")).toBe("sumeet");
  });

  it("overwrites existing value", () => {
    const state = new LiWebState();
    state.set("x", 1);
    state.set("x", 99);
    expect(state.get("x")).toBe(99);
  });

  it("has returns true for existing key", () => {
    const state = new LiWebState();
    state.set("k", true);
    expect(state.has("k")).toBe(true);
  });

  it("has returns false for missing key", () => {
    const state = new LiWebState();
    expect(state.has("nope")).toBe(false);
  });

  it("delete removes a key", () => {
    const state = new LiWebState();
    state.set("k", 1);
    state.delete("k");
    expect(state.has("k")).toBe(false);
  });

  it("clear removes all keys", () => {
    const state = new LiWebState();
    state.set("a", 1);
    state.set("b", 2);
    state.clear();
    expect(state.has("a")).toBe(false);
    expect(state.has("b")).toBe(false);
  });
});

describe("LiWebState — update", () => {
  it("updates value via function", () => {
    const state = new LiWebState();
    state.set("count", 5);
    state.update<number>("count", (v) => v + 1);
    expect(state.get("count")).toBe(6);
  });

  it("throws if key does not exist", () => {
    const state = new LiWebState();
    expect(() => state.update("missing", (v) => v)).toThrow();
  });
});

describe("LiWebState — push / remove", () => {
  it("push appends to existing array", () => {
    const state = new LiWebState();
    state.set("items", [1, 2]);
    state.push("items", 3);
    expect(state.get("items")).toEqual([1, 2, 3]);
  });

  it("push initializes array if key missing", () => {
    const state = new LiWebState();
    state.push("items", "first");
    expect(state.get("items")).toEqual(["first"]);
  });

  it("push throws if value is not an array", () => {
    const state = new LiWebState();
    state.set("name", "sumeet");
    expect(() => state.push("name", "x")).toThrow();
  });

  it("remove filters items by predicate", () => {
    const state = new LiWebState();
    state.set("nums", [1, 2, 3, 4]);
    state.remove<number>("nums", (n) => n % 2 === 0);
    expect(state.get("nums")).toEqual([1, 3]);
  });

  it("remove is no-op for missing key", () => {
    const state = new LiWebState();
    expect(() => state.remove("missing", () => true)).not.toThrow();
  });

  it("remove throws if value is not an array", () => {
    const state = new LiWebState();
    state.set("x", 42);
    expect(() => state.remove("x", () => true)).toThrow();
  });
});

describe("LiWebState — increment / decrement", () => {
  it("increments by 1 by default", () => {
    const state = new LiWebState();
    state.set("count", 0);
    state.increment("count");
    expect(state.get("count")).toBe(1);
  });

  it("increments by custom step", () => {
    const state = new LiWebState();
    state.set("count", 10);
    state.increment("count", 5);
    expect(state.get("count")).toBe(15);
  });

  it("initializes to 0 if key missing then increments", () => {
    const state = new LiWebState();
    state.increment("views");
    expect(state.get("views")).toBe(1);
  });

  it("decrements by 1 by default", () => {
    const state = new LiWebState();
    state.set("count", 5);
    state.decrement("count");
    expect(state.get("count")).toBe(4);
  });

  it("decrements by custom step", () => {
    const state = new LiWebState();
    state.set("count", 10);
    state.decrement("count", 3);
    expect(state.get("count")).toBe(7);
  });

  it("throws if value is not a number", () => {
    const state = new LiWebState();
    state.set("name", "sumeet");
    expect(() => state.increment("name")).toThrow();
    expect(() => state.decrement("name")).toThrow();
  });
});

describe("LiWebState — patch", () => {
  it("merges partial into existing object", () => {
    const state = new LiWebState();
    state.set("user", { name: "sumeet", role: "admin" });
    state.patch("user", { role: "moderator" });
    expect(state.get("user")).toEqual({ name: "sumeet", role: "moderator" });
  });

  it("initializes object if key missing", () => {
    const state = new LiWebState();
    state.patch("config", { theme: "dark" });
    expect(state.get("config")).toEqual({ theme: "dark" });
  });

  it("throws if value is not a plain object", () => {
    const state = new LiWebState();
    state.set("items", [1, 2, 3]);
    expect(() => state.patch("items", { x: 1 } as any)).toThrow();
  });

  it("does not mutate original object", () => {
    const state = new LiWebState();
    const original = { a: 1, b: 2 };
    state.set("data", original);
    state.patch("data", { b: 99 });
    expect(original.b).toBe(2); // original untouched
  });
});

describe("LiWebState — snapshot", () => {
  it("returns all current state as plain object", () => {
    const state = new LiWebState();
    state.set("a", 1);
    state.set("b", "hello");
    expect(state.snapshot()).toEqual({ a: 1, b: "hello" });
  });

  it("returns empty object when no state", () => {
    const state = new LiWebState();
    expect(state.snapshot()).toEqual({});
  });
});

describe("LiWebState — room integration", () => {
  it("state is scoped per room instance", () => {
    // Two separate LiWebState instances should not share data
    const s1 = new LiWebState();
    const s2 = new LiWebState();
    s1.set("count", 10);
    expect(s2.get("count")).toBeUndefined();
  });
});