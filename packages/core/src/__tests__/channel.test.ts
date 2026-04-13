import { describe, it, expect } from "vitest";
import { LiWebChannel } from "../channel";

describe("LiWebChannel", () => {
  it("creates a room lazily on first access", () => {
    const channel = new LiWebChannel("chat");
    expect(channel.hasRoom("general")).toBe(false);
    channel.room("general");
    expect(channel.hasRoom("general")).toBe(true);
  });

  it("returns the same room instance on repeated access", () => {
    const channel = new LiWebChannel("chat");
    const r1 = channel.room("general");
    const r2 = channel.room("general");
    expect(r1).toBe(r2);
  });

  it("creates independent rooms for different keys", () => {
    const channel = new LiWebChannel("chat");
    const r1 = channel.room("general");
    const r2 = channel.room("support");
    expect(r1).not.toBe(r2);
    expect(r1.id).toBe("general");
    expect(r2.id).toBe("support");
  });

  it("room carries correct channel name", () => {
    const channel = new LiWebChannel("chat");
    const room = channel.room("general");
    expect(room.channel).toBe("chat");
  });

  it("deleteRoom removes the room", () => {
    const channel = new LiWebChannel("chat");
    channel.room("general");
    channel.deleteRoom("general");
    expect(channel.hasRoom("general")).toBe(false);
  });

  it("getRooms returns all active room keys", () => {
    const channel = new LiWebChannel("chat");
    channel.room("general");
    channel.room("support");
    channel.room("random");
    expect(channel.getRooms()).toEqual(
      expect.arrayContaining(["general", "support", "random"]),
    );
  });
});