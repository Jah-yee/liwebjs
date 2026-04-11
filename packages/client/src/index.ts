type ConnectHandler = () => void;
type DisconnectHandler = () => void;
type EventHandler = (payload: unknown) => void;

export interface LiWebClient {
  emit(event: string, payload: unknown): void;
  handle(event: string, handler: EventHandler): void;
  on(event: "connect", handler: ConnectHandler): void;
  on(event: "disconnect", handler: DisconnectHandler): void;
  disconnect(): void;
}

export interface LiWebClientOptions {
  reconnect?: boolean;
  reconnectDelay?: number; // ms, default 2000
}

export function createLiWebClient(
  url: string,
  options: LiWebClientOptions = {},
): LiWebClient {
  const { reconnect = true, reconnectDelay = 2000 } = options;

  const connectHandlers: ConnectHandler[] = [];
  const disconnectHandlers: DisconnectHandler[] = [];
  const eventHandlers = new Map<string, EventHandler[]>();

  let ws: WebSocket | null = null;
  let manualClose = false;

  function connect() {
    ws = new WebSocket(url);

    ws.addEventListener("open", () => {
      for (const h of connectHandlers) h();
    });

    ws.addEventListener("message", (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (typeof parsed?.event !== "string") return;
        const handlers = eventHandlers.get(parsed.event);
        if (!handlers) return;
        for (const h of handlers) h(parsed.payload ?? null);
      } catch {
        // ignore malformed packets
      }
    });

    ws.addEventListener("close", () => {
      for (const h of disconnectHandlers) h();
      if (!manualClose && reconnect) {
        setTimeout(connect, reconnectDelay);
      }
    });
  }

  connect();

  return {
    emit(event, payload) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ event, payload }));
    },

    handle(event, handler) {
      if (!eventHandlers.has(event)) eventHandlers.set(event, []);
      eventHandlers.get(event)!.push(handler);
    },

    on(event: any, handler: any) {
      if (event === "connect") connectHandlers.push(handler);
      if (event === "disconnect") disconnectHandlers.push(handler);
    },

    disconnect() {
      manualClose = true;
      ws?.close();
    },
  };
}