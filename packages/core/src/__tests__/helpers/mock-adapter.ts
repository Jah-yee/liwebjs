import type { Adapter } from "../../adapters/adapter.interface";
import type { LiWebConnection } from "../../connection";

/**
 * A controllable in-memory adapter for testing.
 * Lets you simulate connections, messages, and disconnections
 * without any real WebSocket or HTTP server.
 */
export function createMockAdapter() {
  // Captured callbacks set by adapter.attach()
  let _onConnection: ((conn: LiWebConnection) => void) | null = null;
  let _onMessage:
    | ((conn: LiWebConnection, event: string, payload: unknown) => void)
    | null = null;
  let _onClose: ((conn: LiWebConnection) => void) | null = null;

  // Track what was sent per connection: { event, payload }[]
  const sent = new Map<string, { event: string; payload: unknown }[]>();

  const adapter: Adapter = {
    attach(server, onConnection, onMessage, onClose) {
      _onConnection = onConnection;
      _onMessage = onMessage;
      _onClose = onClose;
    },

    send(conn, event, payload) {
      if (!sent.has(conn.id)) sent.set(conn.id, []);
      sent.get(conn.id)!.push({ event, payload });
    },

    close(conn) {
      _onClose?.(conn);
    },
  };

  // --- Test control helpers ---

  function simulateConnection(conn: LiWebConnection) {
    if (!_onConnection) throw new Error("adapter not attached yet");
    sent.set(conn.id, []);
    _onConnection(conn);
  }

  function simulateMessage(
    conn: LiWebConnection,
    event: string,
    payload: unknown,
  ) {
    if (!_onMessage) throw new Error("adapter not attached yet");
    _onMessage(conn, event, payload);
  }

  function simulateDisconnect(conn: LiWebConnection) {
    if (!_onClose) throw new Error("adapter not attached yet");
    _onClose(conn);
  }

  function sentBy(conn: LiWebConnection) {
    return sent.get(conn.id) ?? [];
  }

  return {
    adapter,
    simulateConnection,
    simulateMessage,
    simulateDisconnect,
    sentBy,
  };
}