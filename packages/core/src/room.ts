import type { LiWebConnection } from "./connection.ts";
import { LiWebState } from "./state.ts";
import { LiWebPresenceEngine, type PresenceOptions, type LiWebPresence } from "./presence.ts";
import type { User } from "./auth.ts";

export class LiWebRoom {
  readonly id: string;
  readonly channel: string;
  readonly state: LiWebState;
  readonly presence: LiWebPresenceEngine;

  private members = new Map<string, LiWebConnection>();

  constructor(channel: string, id: string, presenceOptions?: PresenceOptions) {
    this.channel = channel;
    this.id = id;
    this.state = new LiWebState();
    this.presence = new LiWebPresenceEngine(presenceOptions);
  }

  // ── Membership ─────────────────────────────────────────────────

  join(conn: LiWebConnection, user?: User | null): LiWebPresence {
    this.members.set(conn.id, conn);
    return this.presence._join(conn.id, user ?? null);
  }

  leave(conn: LiWebConnection): LiWebPresence | undefined {
    this.members.delete(conn.id);
    return this.presence._leave(conn.id);
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

  // ── Broadcasting ───────────────────────────────────────────────

  emit(event: string, payload: unknown): void {
    for (const conn of this.members.values()) {
      conn.send(event, payload);
    }
  }

  emitExcept(excludeId: string, event: string, payload: unknown): void {
    for (const [id, conn] of this.members.entries()) {
      if (id !== excludeId) conn.send(event, payload);
    }
  }

  emitTo(connId: string, event: string, payload: unknown): void {
    this.members.get(connId)?.send(event, payload);
  }
}