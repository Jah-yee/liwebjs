import { LiWebRoom } from "./room.js";

export class LiWebChannel {
  readonly name: string;

  private rooms = new Map<string, LiWebRoom>();

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Get or create a room by key.
   * Rooms are created lazily on first access.
   */
  room(key: string): LiWebRoom {
    if (!this.rooms.has(key)) {
      this.rooms.set(key, new LiWebRoom(this.name, key));
    }
    return this.rooms.get(key)!;
  }

  /** Check if a room exists without creating it */
  hasRoom(key: string): boolean {
    return this.rooms.has(key);
  }

  /** Delete a room entirely */
  deleteRoom(key: string): void {
    this.rooms.delete(key);
  }

  /** All active room keys in this channel */
  getRooms(): string[] {
    return Array.from(this.rooms.keys());
  }
}