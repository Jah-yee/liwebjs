import type { Adapter } from "./adapters/adapter.interface.js";
// import { wsAdapter } from "./adapters/ws/index.ts";

import { wsAdapter } from "./adapters/ws/index.js";
import type { WsAdapterOptions } from "./adapters/ws/index.js";
import type { Context } from "./context.js";
import { LiWebConnection } from "./connection.js";
import { LiWebChannel } from "./channel.js";
import type { AuthOptions, User } from "./auth.js";
import { validateAuth } from "./auth.js";
import { LiWebPresenceEngine, type PresenceOptions } from "./presence.js";

type LifecycleEvent = "connection" | "disconnect" | "auth:error";
type LifecycleHandler = (ctx: Context) => void;
type EventHandler = (ctx: Context) => void;

export interface LiWebServer {
  on(event: LifecycleEvent, handler: LifecycleHandler): void;
  handle(event: string, handler: EventHandler): void;
  channel(name: string): LiWebChannel;
}

export interface LiWebServerOptions {
  adapter?: Adapter;
  auth?: AuthOptions;
  ping?: WsAdapterOptions;
  presence?: PresenceOptions; // 0.0.3
}

export function createLiWebServer(
  server: unknown,
  options: LiWebServerOptions = {},
): LiWebServer {
  const adapter = options.adapter ?? wsAdapter(options.ping ?? {});
  const authOptions = options.auth ?? {};
  const lifecycleHandlers: Record<LifecycleEvent, LifecycleHandler[]> = {
    connection: [],
    disconnect: [],
    "auth:error": [],
  };

  const eventHandlers = new Map<string, EventHandler[]>();
  const channels = new Map<string, LiWebChannel>();

  // Store authenticated user per connection
  const userStore = new Map<string, User | null>();

  // Track connections pending auth
  const pendingAuth = new Set<string>();
  const authTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function makeCtx(
    conn: LiWebConnection,
    event: string,
    payload: unknown,
  ): Context {
    return {
      connection: conn,
      user: userStore.get(conn.id) ?? null,
      event,
      payload,
      send: conn.send.bind(conn),
    };
  }

  function emitLifecycle(event: LifecycleEvent, ctx: Context) {
    for (const handler of lifecycleHandlers[event]) {
      handler(ctx);
    }
  }

  function emitEvent(conn: LiWebConnection, event: string, payload: unknown) {
    const handlers = eventHandlers.get(event);
    if (!handlers || handlers.length === 0) return;
    const ctx = makeCtx(conn, event, payload);
    for (const handler of handlers) {
      handler(ctx);
    }
  }

  adapter.attach(
    server,

    // onConnection
    (conn: LiWebConnection) => {
      userStore.set(conn.id, null);

      // If auth is enabled, wait for __auth event before firing connection
      if (authOptions.secret) {
        pendingAuth.add(conn.id);

        const timeout = authOptions.timeout ?? 5000;
        const timer = setTimeout(() => {
          if (pendingAuth.has(conn.id)) {
            conn.send("auth:error", { reason: "auth timeout" });
            conn.close();
            pendingAuth.delete(conn.id);
            userStore.delete(conn.id);
          }
        }, timeout);

        authTimers.set(conn.id, timer);
        return;
      }

      // Auth disabled — fire connection immediately
      emitLifecycle("connection", makeCtx(conn, "connection", null));
    },

    // onMessage
    (conn: LiWebConnection, event: string, payload: unknown) => {
      // Handle auth handshake
      if (event === "__auth") {
        if (!pendingAuth.has(conn.id)) {
          // Already authenticated, ignore
          return;
        }

        const result = validateAuth(payload, authOptions);

        // Clear timeout
        const timer = authTimers.get(conn.id);
        if (timer) {
          clearTimeout(timer);
          authTimers.delete(conn.id);
        }

        if (!result.valid) {
          conn.send("auth:error", { reason: result.reason });
          conn.close();
          pendingAuth.delete(conn.id);
          userStore.delete(conn.id);

          emitLifecycle(
            "auth:error",
            makeCtx(conn, "auth:error", { reason: result.reason }),
          );
          return;
        }

        // Auth passed
        pendingAuth.delete(conn.id);
        userStore.set(conn.id, result.user);

        conn.send("auth:success", { user: result.user });
        emitLifecycle("connection", makeCtx(conn, "connection", null));
        return;
      }

      // Block messages from unauthenticated connections
      if (pendingAuth.has(conn.id)) {
        conn.send("auth:error", { reason: "not authenticated" });
        return;
      }

      emitEvent(conn, event, payload);
    },

    // onClose
    (conn: LiWebConnection) => {
      // Clean up auth state
      const timer = authTimers.get(conn.id);
      if (timer) {
        clearTimeout(timer);
        authTimers.delete(conn.id);
      }
      pendingAuth.delete(conn.id);

      const ctx = makeCtx(conn, "disconnect", null);
      userStore.delete(conn.id);

      emitLifecycle("disconnect", ctx);
    },
  );

  return {
    on(event, handler) {
      lifecycleHandlers[event].push(handler);
    },

    handle(event, handler) {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, []);
      }
      eventHandlers.get(event)!.push(handler);
    },

    channel(name) {
      if (!channels.has(name)) {
        channels.set(name, new LiWebChannel(name, options.presence ?? {} ));
      }
      return channels.get(name)!;
    },
  };
}