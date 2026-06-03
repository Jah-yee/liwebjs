import { LiWebRoom } from "./room.ts";
import type { PresenceOptions } from "./presence.ts";

export class LiWebChannel {
  readonly name: string;
  private rooms = new Map<string, LiWebRoom>();
  private presenceOptions: PresenceOptions;

  constructor(name: string, presenceOptions: PresenceOptions = {}) {
    this.name = name;
    this.presenceOptions = presenceOptions;
  }

  room(key: string): LiWebRoom {
    if (!this.rooms.has(key)) {
      this.rooms.set(key, new LiWebRoom(this.name, key, this.presenceOptions));
    }
    return this.rooms.get(key)!;
  }

  hasRoom(key: string): boolean {
    return this.rooms.has(key);
  }

  deleteRoom(key: string): void {
    // cleanup presence timers before deleting
    this.rooms.get(key)?.presence._destroy();
    this.rooms.delete(key);
  }

  getRooms(): string[] {
    return Array.from(this.rooms.keys());
  }
}