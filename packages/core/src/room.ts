import type { LiWebConnection } from "./connection";

export class LiWebRoom {
  readonly id: string;
  readonly channel: string;

  private members = new Map<string, LiWebConnection>();

  constructor(channel: string, id: string) {
    this.channel = channel;
    this.id = id;
  }

  // ── Membership ────────────────────────────────────────────────

  join(conn: LiWebConnection): void {
    this.members.set(conn.id, conn);
  }

  leave(conn: LiWebConnection): void {
    this.members.delete(conn.id);
  }

  has(conn: LiWebConnection): boolean {
    return this.members.has(conn.id);
  }

  get size(): number {
    return this.members.size;
  }

  getMembers(): ReadonlyMap<string, LiWebConnection> {
    return this.members;
  }

  // ── Broadcasting ──────────────────────────────────────────────

  /** Broadcast to every member in the room */
  emit(event: string, payload: unknown): void {
    for (const conn of this.members.values()) {
      conn.send(event, payload);
    }
  }

  /** Broadcast to every member except one (e.g. the sender) */
  emitExcept(excludeId: string, event: string, payload: unknown): void {
    for (const [id, conn] of this.members.entries()) {
      if (id !== excludeId) {
        conn.send(event, payload);
      }
    }
  }

  /** Send to a specific member by connection id */
  emitTo(connId: string, event: string, payload: unknown): void {
    const conn = this.members.get(connId);
    conn?.send(event, payload);
  }
}