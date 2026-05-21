# liwebjs-client

**Browser WebSocket client SDK for [liwebjs](https://www.npmjs.com/package/liwebjs).**

A lightweight, framework-agnostic browser client with auto-reconnect, event routing, and built-in auth support.

[![npm version](https://img.shields.io/npm/v/liwebjs-client)](https://www.npmjs.com/package/liwebjs-client)
[![license](https://img.shields.io/npm/l/liwebjs-client)](LICENSE)

---

## Installation

```bash
npm install liwebjs-client
```

---

## Quick Start

```typescript
import { createLiWebClient } from "liwebjs-client";

const client = createLiWebClient("ws://localhost:3001");

client.on("connect", () => {
  console.log("connected");
});

client.on("disconnect", () => {
  console.log("disconnected — will auto-reconnect");
});

client.handle("welcome", (payload) => {
  console.log("welcome:", payload);
});

client.handle("message", (payload) => {
  console.log("new message:", payload);
});

client.emit("message", { text: "hello world" });
```

---

## API Reference

### `createLiWebClient(url, options?)`

Creates a browser WebSocket client and immediately initiates a connection.

```typescript
import { createLiWebClient } from "liwebjs-client";

const client = createLiWebClient("ws://localhost:3001", {
  reconnect: true, // auto-reconnect on unexpected disconnect (default: true)
  reconnectDelay: 2000, // ms between reconnect attempts (default: 2000)
  auth: {
    // optional — sent automatically on every connect
    secret: "APP_SECRET",
    secure: {
      id: "user_1",
      name: "Sumeet",
      role: "admin",
    },
  },
});
```

| Option           | Type         | Default     | Description                                                 |
| ---------------- | ------------ | ----------- | ----------------------------------------------------------- |
| `reconnect`      | `boolean`    | `true`      | Auto-reconnect on unexpected disconnect                     |
| `reconnectDelay` | `number`     | `2000`      | Milliseconds to wait before reconnecting                    |
| `auth`           | `AuthConfig` | `undefined` | If set, sends `__auth` event automatically on every connect |
| `auth.secret`    | `string`     | —           | Must match server's `auth.secret`                           |
| `auth.secure`    | `object`     | `undefined` | User data stored in `ctx.user` on the server                |

**Returns:** `LiWebClient`

---

### `LiWebClient`

Returned by `createLiWebClient()`.

---

#### `.on(event, handler)`

Listen to connection lifecycle events.

```typescript
client.on("connect", () => {
  console.log("socket opened");
  // safe to emit events after this
});

client.on("disconnect", () => {
  console.log("socket closed");
  // if reconnect: true, will reconnect automatically
});
```

| Event          | When it fires                                       |
| -------------- | --------------------------------------------------- |
| `"connect"`    | WebSocket `open` event — connection established     |
| `"disconnect"` | WebSocket `close` event — connection lost or closed |

---

#### `.handle(event, handler)`

Register a handler for a named event received from the server. Multiple handlers per event are supported.

```typescript
// single handler
client.handle("message", (payload) => {
  console.log(payload); // whatever the server sent
});

// multiple handlers for same event
client.handle("message", logHandler);
client.handle("message", renderHandler);

// with type assertion
client.handle("message", (payload) => {
  const msg = payload as { username: string; text: string; ts: number };
  renderMessage(msg);
});

// built-in auth events from server
client.handle("auth:success", (payload) => {
  const { user } = payload as { user: { id: string; name: string } };
  console.log("authenticated as:", user.name);
});

client.handle("auth:error", (payload) => {
  const { reason } = payload as { reason: string };
  console.error("auth failed:", reason);
  // reason: "invalid secret" | "missing auth payload" | "auth timeout"
});
```

---

#### `.emit(event, payload)`

Send a named event with a payload to the server.

```typescript
// simple emit
client.emit("ping", {});

// with payload
client.emit("message", {
  username: "Sumeet",
  text: "hello world",
});

// any serializable value
client.emit("config:update", { theme: "dark", notifications: true });
```

> Safe no-op if the connection is not open — will not throw.

---

#### `.auth(config)`

Send an auth payload manually. Use this when auth credentials are fetched asynchronously after the client is created, or when you need to re-authenticate mid-session.

```typescript
// auto auth via options (recommended)
const client = createLiWebClient("ws://localhost:3001", {
  auth: { secret: "APP_SECRET", secure: { id: "u1" } },
});

// manual auth — useful when credentials are fetched async
const client = createLiWebClient("ws://localhost:3001");

const token = await fetchAuthToken();
client.auth({
  secret: token,
  secure: { id: currentUser.id, name: currentUser.name },
});
```

```typescript
interface AuthConfig {
  secret: string;
  secure?: Record<string, unknown>; // becomes ctx.user on the server
}
```

---

#### `.disconnect()`

Close the connection manually. Disables auto-reconnect.

```typescript
client.disconnect();
// WebSocket closes, no reconnect attempt is made
```

---

## Usage with React

The recommended pattern is to encapsulate all liwebjs-client logic in a custom hook.

```typescript
// hooks/useSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { createLiWebClient } from "liwebjs-client";

export function useSocket(url: string) {
  const clientRef = useRef<ReturnType<typeof createLiWebClient> | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = createLiWebClient(url, { reconnect: true });
    clientRef.current = client;

    client.on("connect", () => setConnected(true));
    client.on("disconnect", () => setConnected(false));

    return () => client.disconnect();
  }, [url]);

  const emit = useCallback((event: string, payload: unknown) => {
    clientRef.current?.emit(event, payload);
  }, []);

  const handle = useCallback((event: string, handler: (p: unknown) => void) => {
    clientRef.current?.handle(event, handler);
  }, []);

  return { connected, emit, handle };
}
```

```typescript
// hooks/useChat.ts — full chat example
import { useEffect, useRef, useState, useCallback } from "react";
import { createLiWebClient } from "liwebjs-client";

interface Message {
  id: string;
  username: string;
  text: string;
  ts: number;
  mine: boolean;
}

export function useChat(username: string) {
  const clientRef = useRef<ReturnType<typeof createLiWebClient> | null>(null);
  const myIdRef = useRef<string | null>(null);

  const [state, setState] = useState({
    connected: false,
    myId: null as string | null,
    onlineCount: 0,
    messages: [] as Message[],
    typingUsers: [] as string[],
  });

  useEffect(() => {
    const client = createLiWebClient("ws://localhost:3001");
    clientRef.current = client;

    client.on("connect", () => setState((s) => ({ ...s, connected: true })));
    client.on("disconnect", () =>
      setState((s) => ({ ...s, connected: false })),
    );

    client.handle("welcome", (payload) => {
      const { id, onlineCount, history } = payload as any;
      myIdRef.current = id;
      setState((s) => ({
        ...s,
        myId: id,
        onlineCount,
        messages: (history ?? []).map((m: any) => ({
          ...m,
          mine: m.id === id,
        })),
      }));
    });

    client.handle("message", (payload) => {
      const p = payload as any;
      setState((s) => ({
        ...s,
        messages: [...s.messages, { ...p, mine: p.id === myIdRef.current }],
        typingUsers: s.typingUsers.filter((u) => u !== p.username),
      }));
    });

    client.handle("user:joined", (payload) => {
      setState((s) => ({ ...s, onlineCount: (payload as any).onlineCount }));
    });

    client.handle("user:left", (payload) => {
      setState((s) => ({ ...s, onlineCount: (payload as any).onlineCount }));
    });

    client.handle("typing", (payload) => {
      const { username: u } = payload as { username: string };
      setState((s) => ({
        ...s,
        typingUsers: s.typingUsers.includes(u)
          ? s.typingUsers
          : [...s.typingUsers, u],
      }));
      setTimeout(() => {
        setState((s) => ({
          ...s,
          typingUsers: s.typingUsers.filter((x) => x !== u),
        }));
      }, 2000);
    });

    return () => client.disconnect();
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      clientRef.current?.emit("message", { username, text });
    },
    [username],
  );

  const sendTyping = useCallback(() => {
    clientRef.current?.emit("typing", { username });
  }, [username]);

  return { state, sendMessage, sendTyping };
}
```

---

## Usage with Vanilla JS

No bundler required — works in any browser that supports ES modules.

```html
<script type="module">
  import { createLiWebClient } from "https://esm.sh/liwebjs-client";

  const client = createLiWebClient("ws://localhost:3001");

  client.on("connect", () => {
    document.getElementById("status").textContent = "connected";
  });

  client.on("disconnect", () => {
    document.getElementById("status").textContent = "reconnecting...";
  });

  client.handle("message", (payload) => {
    const li = document.createElement("li");
    li.textContent = payload.text;
    document.getElementById("messages").appendChild(li);
  });

  document.getElementById("send").addEventListener("click", () => {
    const input = document.getElementById("input");
    client.emit("message", { text: input.value });
    input.value = "";
  });
</script>
```

---

## Auto-Reconnect Behaviour

| Scenario                      | Reconnects?                          |
| ----------------------------- | ------------------------------------ |
| Network drops unexpectedly    | Yes — after `reconnectDelay` ms      |
| Server restarts               | Yes — after `reconnectDelay` ms      |
| `client.disconnect()` called  | No — manual close disables reconnect |
| Auth fails (`auth:error`)     | No — connection is closed by server  |
| `reconnect: false` in options | No                                   |

When reconnecting, if `options.auth` was provided, the `__auth` event is re-sent automatically on every reconnect — you do not need to re-authenticate manually.

---

## Message Format

All messages over the wire use a consistent JSON envelope:

```json
{ "event": "message", "payload": { "text": "hello" } }
```

Malformed JSON messages from the server are silently discarded — they will not crash the client or fire error events.

---

## Browser Compatibility

Uses only the native `WebSocket` API. Supported in all modern browsers:

| Browser        | Version |
| -------------- | ------- |
| Chrome         | 16+     |
| Firefox        | 11+     |
| Safari         | 7+      |
| Edge           | 12+     |
| iOS Safari     | 6+      |
| Android Chrome | 18+     |

No polyfills required.

---

## TypeScript

The package ships with full TypeScript definitions.

```typescript
import {
  createLiWebClient,
  type LiWebClient,
  type LiWebClientOptions,
  type AuthConfig,
} from "liwebjs-client";

const options: LiWebClientOptions = {
  reconnect: true,
  reconnectDelay: 2000,
  auth: {
    secret: "APP_SECRET",
    secure: { id: "u1", role: "admin" },
  },
};

const client: LiWebClient = createLiWebClient("ws://localhost:3001", options);
```

---

## Related

- [`liwebjs`](https://www.npmjs.com/package/liwebjs) — server-side framework
- [GitHub Repository](https://github.com/sumeet57/liwebjs)
- [Examples](https://github.com/sumeet57/liwebjs/tree/main/examples)
- [Full Documentation](https://github.com/sumeet57/liwebjs/blob/main/DOCUMENTATION.md)

---

## License

MIT © [Sumeet Umbalkar](https://github.com/sumeet57)
