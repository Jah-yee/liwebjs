import { WebSocketServer, type WebSocket } from "ws";
import { randomUUID } from "crypto";
import type { IncomingMessage } from "http";
import type { Adapter } from "../adapter.interface.js";
import { LiWebConnection } from "../../connection.js";

const socketMap = new WeakMap<LiWebConnection, WebSocket>();

export interface WsAdapterOptions {
  pingInterval?: number; // ms between pings (default: 25000)
  pingTimeout?: number;  // ms to wait for pong before closing (default: 10000)
}

export function wsAdapter(options: WsAdapterOptions = {}): Adapter {
  const pingInterval = options.pingInterval ?? 25000;
  const pingTimeout = options.pingTimeout ?? 10000;

  return {
    attach(server, onConnection, onMessage, onClose) {
      if (typeof server !== "object" || server === null || !("on" in server)) {
        throw new Error("wsAdapter requires a Node HTTP server");
      }

      const wss = new WebSocketServer({ noServer: true });

      // Track pong timeout per connection
      const pongTimers = new Map<string, ReturnType<typeof setTimeout>>();
      const pingTimers = new Map<string, ReturnType<typeof setInterval>>();

      function startHeartbeat(conn: LiWebConnection, ws: WebSocket) {
        const interval = setInterval(() => {
          if (ws.readyState !== ws.OPEN) return;

          // Send ping
          ws.ping();

          // Start pong timeout — if pong not received, close connection
          const pongTimer = setTimeout(() => {
            console.log(`[liwebjs] connection ${conn.id} timed out, closing`);
            ws.terminate();
          }, pingTimeout);

          pongTimers.set(conn.id, pongTimer);
        }, pingInterval);

        pingTimers.set(conn.id, interval);
      }

      function stopHeartbeat(connId: string) {
        const interval = pingTimers.get(connId);
        const pongTimer = pongTimers.get(connId);
        if (interval) { clearInterval(interval); pingTimers.delete(connId); }
        if (pongTimer) { clearTimeout(pongTimer); pongTimers.delete(connId); }
      }

      (server as any).on(
        "upgrade",
        (req: IncomingMessage, socket: any, head: any) => {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
          });
        },
      );

      wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
        const conn = new LiWebConnection(
          randomUUID(),
          {
            headers: req.headers,
            ip: req.socket.remoteAddress,
            protocol: "ws",
          },
          this,
        );

        socketMap.set(conn, ws);
        onConnection(conn);

        // Start heartbeat after connection established
        startHeartbeat(conn, ws);

        // Pong received — cancel the timeout, connection is alive
        ws.on("pong", () => {
          const pongTimer = pongTimers.get(conn.id);
          if (pongTimer) {
            clearTimeout(pongTimer);
            pongTimers.delete(conn.id);
          }
        });

        ws.on("message", (data) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (typeof parsed?.event === "string") {
              onMessage(conn, parsed.event, parsed.payload ?? null);
            }
          } catch {
            // ignore malformed packets
          }
        });

        ws.on("close", () => {
          stopHeartbeat(conn.id);
          socketMap.delete(conn);
          onClose(conn);
        });
      });
    },

    send(conn, event, payload) {
      const ws = socketMap.get(conn);
      if (!ws || ws.readyState !== ws.OPEN) return;
      ws.send(JSON.stringify({ event, payload }));
    },

    close(conn) {
      const ws = socketMap.get(conn);
      ws?.close();
    },
  };
}