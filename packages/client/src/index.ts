type ConnectHandler = () => void;
type DisconnectHandler = () => void;
type EventHandler = (payload: unknown) => void;

export interface AuthConfig {
  secret: string;
  secure?: Record<string, unknown>;
}

export interface LiWebClient {
  emit(event: string, payload: unknown): void;
  handle(event: string, handler: EventHandler): void;
  on(event: "connect", handler: ConnectHandler): void;
  on(event: "disconnect", handler: DisconnectHandler): void;
  auth(config: AuthConfig): void;
  disconnect(): void;
}

export interface LiWebClientOptions {
  reconnect?: boolean;
  reconnectDelay?: number;
  /**
   * If provided, auth handshake is sent automatically on connect.
   */
  auth?: AuthConfig;
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
  let pendingAuth: AuthConfig | null = options.auth ?? null;

  function sendRaw(event: string, payload: unknown) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ event, payload }));
  }

  function connect() {
    ws = new WebSocket(url);

    ws.addEventListener("open", () => {
      // Auto-send auth if configured
      if (pendingAuth) {
        sendRaw("__auth", {
          secret: pendingAuth.secret,
          secure: pendingAuth.secure,
        });
      }
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
      sendRaw(event, payload);
    },

    handle(event, handler) {
      if (!eventHandlers.has(event)) eventHandlers.set(event, []);
      eventHandlers.get(event)!.push(handler);
    },

    on(event: any, handler: any) {
      if (event === "connect") connectHandlers.push(handler);
      if (event === "disconnect") disconnectHandlers.push(handler);
    },

    // Send auth manually — useful if auth config isn't known at connect time
    auth(config: AuthConfig) {
      pendingAuth = config;
      sendRaw("__auth", {
        secret: config.secret,
        secure: config.secure,
      });
    },

    disconnect() {
      manualClose = true;
      ws?.close();
    },
  };
}