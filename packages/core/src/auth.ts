export interface AuthOptions {
  /**
   * The secret string clients must send to authenticate.
   * If not provided, auth is disabled and all connections are allowed.
   */
  secret?: string;

  /**
   * How long to wait for the auth message before closing
   * the connection (ms). Default: 5000
   */
  timeout?: number;
}

export interface AuthPayload {
  secret: string;
  secure?: Record<string, unknown>;
}

export interface User {
  id?: string;
  [key: string]: unknown;
}

export function validateAuth(
  payload: unknown,
  options: AuthOptions,
): { valid: boolean; user: User | null; reason?: string } {
  // Auth disabled — everyone is allowed, no user
  if (!options.secret) {
    return { valid: true, user: null };
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("secret" in payload)
  ) {
    return { valid: false, user: null, reason: "missing auth payload" };
  }

  const auth = payload as AuthPayload;

  if (auth.secret !== options.secret) {
    return { valid: false, user: null, reason: "invalid secret" };
  }

  return {
    valid: true,
    user: (auth.secure as User) ?? null,
  };
}