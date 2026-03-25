import type { Adapter } from "./adapters/adapter.interface";
import { wsAdapter } from "./adapters/ws";
import type { Context } from "./context";
import { LiWebConnection } from "./connection";

type LifecycleEvent = "connection" | "disconnect";
type LifecycleHandler = (ctx: Context) => void;
type EventHandler = (ctx: Context) => void;

export interface LiWebServer {
  on(event: LifecycleEvent, handler: LifecycleHandler): void;
  handle(event: string, handler: EventHandler): void;
}

export interface LiWebServerOptions {
  adapter?: Adapter;
}

export function createLiWebServer(
  server: unknown,
  options: LiWebServerOptions = {},
): LiWebServer {
  const adapter = options.adapter ?? wsAdapter();

  const lifecycleHandlers: Record<LifecycleEvent, LifecycleHandler[]> = {
    connection: [],
    disconnect: [],
  };

  const eventHandlers = new Map<string, EventHandler[]>();

  function emitLifecycle(event: LifecycleEvent, ctx: Context) {
    for (const handler of lifecycleHandlers[event]) {
      handler(ctx);
    }
  }

  function emitEvent(conn: LiWebConnection, event: string, payload: unknown) {
    const handlers = eventHandlers.get(event);
    if (!handlers || handlers.length === 0) return;

    const ctx: Context = {
      connection: conn,
      user: null,
      event,
      payload,
      send: conn.send.bind(conn),
    };

    for (const handler of handlers) {
      handler(ctx);
    }
  }

  adapter.attach(
    server,
    (conn) => {
      emitLifecycle("connection", {
        connection: conn,
        user: null,
        event: "connection",
        payload: null,
        send: conn.send.bind(conn),
      });
    },
    (conn, event, payload) => {
      emitEvent(conn, event, payload); // ✅ real dispatch now
    },
    (conn) => {
      emitLifecycle("disconnect", {
        connection: conn,
        user: null,
        event: "disconnect",
        payload: null,
        send: conn.send.bind(conn),
      });
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
  };
}