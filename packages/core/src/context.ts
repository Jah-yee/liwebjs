import type { LiWebConnection } from "./connection.js";
import type { User } from "./auth.ts";

export type { User };

export interface Context {
  readonly connection: LiWebConnection;
  readonly user: User | null;
  readonly event: string;
  readonly payload: unknown;

  send(event: string, payload: unknown): void;
}