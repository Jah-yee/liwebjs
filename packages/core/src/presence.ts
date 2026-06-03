import type { User } from "./auth.ts";

export interface LiWebPresence {
  connId: string;
  user: User | null;
  status: "online" | "offline";
  lastSeen: Date;
  activity: string | null;
  joinedAt: Date;
}

export interface PresenceOptions {
  offlineTTL?: number; // ms to keep offline records (default: 60000) basically 60s
}

export class LiWebPresenceEngine {
  private records = new Map<string, LiWebPresence>();
  private offlineTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private offlineTTL: number;

  constructor(options: PresenceOptions = {}) {
    this.offlineTTL = options.offlineTTL ?? 60000;
  }

  // Internal hooks (called by room)

  _join(connId: string, user: User | null): LiWebPresence {
    // cancel any pending offline cleanup from previous session
    const existing = this.offlineTimers.get(connId);
    if (existing) {
      clearTimeout(existing);
      this.offlineTimers.delete(connId);
    }

    // create or update presence record
    const record: LiWebPresence = {
      connId,
      user,
      status: "online",
      lastSeen: new Date(),
      activity: null,
      joinedAt: new Date(),
    };

    this.records.set(connId, record);
    return record;
  }

  _leave(connId: string): LiWebPresence | undefined {
    const record = this.records.get(connId);
    if (!record) return undefined;

    // mark offline + set lastSeen
    record.status = "offline";
    record.lastSeen = new Date();
    record.activity = null;

    // schedule cleanup after TTL
    const timer = setTimeout(() => {
      this.records.delete(connId);
      this.offlineTimers.delete(connId);
    }, this.offlineTTL);

    this.offlineTimers.set(connId, timer);
    return record;
  }

  // Public API

  /**
   * Get presence record for a specific connection.
   */
  get(connId: string): LiWebPresence | undefined {
    return this.records.get(connId);
  }

  /**
   * All currently ONLINE presence records.
   */
  online(): LiWebPresence[] {
    return Array.from(this.records.values()).filter(
      (r) => r.status === "online"
    );
  }

  /**
   * All presence records — both online and recently offline.
   */
  all(): LiWebPresence[] {
    return Array.from(this.records.values());
  }

  /**
   * Number of online users.
   */
  count(): number {
    return this.online().length;
  }

  /**
   * Last seen timestamp for a connection.
   * Returns undefined if no record exists.
   */
  lastSeen(connId: string): Date | undefined {
    return this.records.get(connId)?.lastSeen;
  }

  /**
   * Check if a connection is currently online.
   */
  isOnline(connId: string): boolean {
    return this.records.get(connId)?.status === "online";
  }

  /**
   * Set activity string for a connection.
   * e.g. "typing", "idle", "recording", "viewing"
   * Pass null to clear activity.
   */
  setActivity(connId: string, activity: string | null): LiWebPresence | undefined {
    const record = this.records.get(connId);
    if (!record || record.status === "offline") return undefined;

    record.activity = activity;
    record.lastSeen = new Date(); // update lastSeen on any activity
    return record;
  }

  /**
   * Get all connections with a specific activity.
   */
  withActivity(activity: string): LiWebPresence[] {
    return this.online().filter((r) => r.activity === activity);
  }

  /**
   * Snapshot of all online presence — plain object, safe to send to clients.
   */
  snapshot(): Omit<LiWebPresence, never>[] {
    return this.online().map((r) => ({ ...r }));
  }

  /**
   * Cleanup — clear all timers. Called when room is deleted.
   */
  _destroy(): void {
    for (const timer of this.offlineTimers.values()) {
      clearTimeout(timer);
    }
    this.offlineTimers.clear();
    this.records.clear();
  }
}