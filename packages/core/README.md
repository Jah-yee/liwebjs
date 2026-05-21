# liwebjs

**Lightweight realtime backend framework for Node.js.**

A structured, developer-friendly alternative to Socket.IO — built on WebSockets with channels, rooms, shared state, authentication, and heartbeat reliability built in.

[![npm version](https://img.shields.io/npm/v/liwebjs)](https://www.npmjs.com/package/liwebjs)
[![license](https://img.shields.io/npm/l/liwebjs)](LICENSE)
[![tests](https://img.shields.io/github/actions/workflow/status/sumeet57/liwebjs/ci.yml?label=tests)](https://github.com/sumeet57/liwebjs/actions)

---

## Why liwebjs?

Every realtime project ends up re-implementing the same patterns from scratch:

```
Raw WebSocket              liwebjs
─────────────────          ───────────────────
ws.on("message", fn)  →   liweb.handle("chat:message", fn)
manual room tracking  →   channel("chat").room("general")
manual auth logic     →   options.auth = { secret: "..." }
manual state sync     →   room.state.set / get / push / patch
manual heartbeat      →   options.ping = { pingInterval: 25000 }
```

liwebjs standardises all of these as first-class framework features.

---

## Installation

```bash
npm install liwebjs
```

---

## Quick Start

```typescript
import http from "http";
import { createLiWebServer } from "liwebjs";

const httpServer = http.createServer();
const liweb = createLiWebServer(httpServer);

const general = liweb.channel("chat").room("general");

liweb.on("connection", (ctx) => {
  general.join(ctx.connection);
  ctx.send("welcome", { id: ctx.connection.id, onlineCount: general.size });
});

liweb.handle("message", (ctx) => {
  general.emit("message", ctx.payload);
});

liweb.on("disconnect", (ctx) => {
  general.leave(ctx.connection);
  general.emit("user:left", { onlineCount: general.size });
});

httpServer.listen(3001, () => {
  console.log("server running on http://localhost:3001");
});
```

---

## API Reference

### `createLiWebServer(server, options?)`

Creates a liwebjs server attached to a Node.js HTTP server.

```typescript
import { createLiWebServer } from "liwebjs";
import http from "http";

const httpServer = http.createServer();

const liweb = createLiWebServer(httpServer, {
  adapter: wsAdapter(), // optional — defaults to wsAdapter()
  auth: {
    secret: "APP_SECRET", // required to enable auth
    timeout: 5000, // ms to wait for __auth event (default: 5000)
  },
  ping: {
    pingInterval: 25000, // ms between server pings (default: 25000)
    pingTimeout: 10000, // ms to wait for pong before closing (default: 10000)
  },
});
```

**Returns:** `LiWebServer`

| Option              | Type      | Default       | Description                          |
| ------------------- | --------- | ------------- | ------------------------------------ |
| `adapter`           | `Adapter` | `wsAdapter()` | Transport adapter                    |
| `auth.secret`       | `string`  | `undefined`   | Enables auth when set                |
| `auth.timeout`      | `number`  | `5000`        | Auth handshake timeout in ms         |
| `ping.pingInterval` | `number`  | `25000`       | Interval between heartbeat pings     |
| `ping.pingTimeout`  | `number`  | `10000`       | Time to wait for pong before closing |

---

### `LiWebServer`

Returned by `createLiWebServer()`.

#### `.on(event, handler)`

Listen to server lifecycle events.

```typescript
liweb.on("connection", (ctx) => {
  console.log("connected:", ctx.connection.id);
  console.log("user:", ctx.user); // populated if auth enabled
});

liweb.on("disconnect", (ctx) => {
  console.log("disconnected:", ctx.connection.id);
});

liweb.on("auth:error", (ctx) => {
  console.log("auth failed:", ctx.payload);
  // ctx.payload = { reason: "invalid secret" | "missing auth payload" | "auth timeout" }
});
```

| Event          | When it fires                                          |
| -------------- | ------------------------------------------------------ |
| `"connection"` | Client connects (after auth passes if auth is enabled) |
| `"disconnect"` | Client disconnects (graceful or timeout)               |
| `"auth:error"` | Client fails authentication                            |

#### `.handle(event, handler)`

Register a handler for a named client event. Multiple handlers per event are supported — all fire in registration order.

```typescript
liweb.handle("ping", (ctx) => {
  ctx.send("pong", { ts: Date.now() });
});

liweb.handle("chat:message", (ctx) => {
  const { username, text } = ctx.payload as { username: string; text: string };
  general.emit("chat:message", { username, text, ts: Date.now() });
});

// Multiple handlers for the same event
liweb.handle("message", logHandler);
liweb.handle("message", broadcastHandler);
```

#### `.channel(name)`

Get or create a named channel. Channels are created lazily on first access.

```typescript
const chat = liweb.channel("chat");
const notify = liweb.channel("notifications");
const game = liweb.channel("game");
```

---

### `Context` (ctx)

Every handler receives a `ctx` object.

```typescript
interface Context {
  connection: LiWebConnection; // the connection that sent this event
  user: User | null; // populated after successful auth
  event: string; // name of the event
  payload: unknown; // data sent by the client
  send(event: string, payload: unknown): void; // reply to this connection
}
```

**Example:**

```typescript
liweb.handle("message", (ctx) => {
  console.log(ctx.connection.id); // "a1b2c3d4-..."
  console.log(ctx.user); // { id: "u1", name: "Sumeet", role: "admin" }
  console.log(ctx.event); // "message"
  console.log(ctx.payload); // { text: "hello" }

  ctx.send("ack", { ok: true }); // send back to same connection
});
```

---

### `LiWebConnection`

Represents a single connected client.

```typescript
interface LiWebConnection {
  readonly id: string; // UUID, runtime-immutable
  readonly meta: ConnectionMeta;
}

interface ConnectionMeta {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  protocol: string; // "ws"
}
```

**Methods:**

```typescript
conn.send(event: string, payload: unknown): void
// Send an event to this specific connection

conn.close(): void
// Close this connection
```

**Example:**

```typescript
liweb.on("connection", (ctx) => {
  console.log(ctx.connection.id); // "a1b2c3d4-..."
  console.log(ctx.connection.meta.ip); // "127.0.0.1"
  console.log(ctx.connection.meta.protocol); // "ws"
  console.log(ctx.connection.meta.headers); // { host: "localhost:3001", ... }

  ctx.connection.send("welcome", { id: ctx.connection.id });
  // same as ctx.send("welcome", { id: ctx.connection.id })
});
```

---

### `LiWebChannel`

A logical namespace grouping multiple rooms. Get via `liweb.channel(name)`.

#### Methods

```typescript
channel.room(key: string): LiWebRoom
// Get or create a room. Rooms are created lazily.

channel.hasRoom(key: string): boolean
// Check if a room exists without creating it.

channel.deleteRoom(key: string): void
// Delete a room entirely.

channel.getRooms(): string[]
// Returns all active room keys in this channel.
```

**Example:**

```typescript
const chat = liweb.channel("chat");

chat.room("general"); // creates room
chat.room("support"); // creates room
chat.hasRoom("general"); // → true
chat.hasRoom("random"); // → false
chat.getRooms(); // → ["general", "support"]
chat.deleteRoom("support"); // removes room
chat.getRooms(); // → ["general"]
```

---

### `LiWebRoom`

A group of connections within a channel. Get via `channel.room(key)`.

#### Membership

```typescript
room.join(conn: LiWebConnection): void
// Add a connection to the room.

room.leave(conn: LiWebConnection): void
// Remove a connection from the room. No-op if not a member.

room.has(conn: LiWebConnection): boolean
// Check if a connection is in the room.

room.size: number
// Current number of members.

room.getMembers(): ReadonlyMap<string, LiWebConnection>
// All current members keyed by connection ID.
```

#### Broadcasting

```typescript
room.emit(event: string, payload: unknown): void
// Send to ALL members in the room.

room.emitExcept(excludeId: string, event: string, payload: unknown): void
// Send to all members EXCEPT the specified connection ID.
// Typical use: broadcast a message without echoing it back to the sender.

room.emitTo(connId: string, event: string, payload: unknown): void
// Send to ONE specific member by connection ID. No-op if not found.
```

**Example:**

```typescript
const general = liweb.channel("chat").room("general");

liweb.on("connection", (ctx) => {
  general.join(ctx.connection);
  console.log("room size:", general.size);

  // tell everyone else someone joined
  general.emitExcept(ctx.connection.id, "user:joined", {
    id: ctx.connection.id,
    onlineCount: general.size,
  });
});

liweb.handle("message", (ctx) => {
  // broadcast to entire room including sender
  general.emit("message", ctx.payload);
});

liweb.handle("dm", (ctx) => {
  const { targetId, text } = ctx.payload as { targetId: string; text: string };
  // send to one specific user
  general.emitTo(targetId, "dm", { from: ctx.connection.id, text });
});

liweb.on("disconnect", (ctx) => {
  general.leave(ctx.connection);
  general.emit("user:left", { onlineCount: general.size });
});
```

---

### `LiWebState`

Per-room in-memory state store. Access via `room.state`.

#### All Methods

```typescript
// ── Read ─────────────────────────────────────────────────────────

room.state.get<T>(key: string): T | undefined
// Retrieve a value. Returns undefined if key does not exist.

room.state.has(key: string): boolean
// Check if a key exists.

room.state.snapshot(): Record<string, unknown>
// Return all state as a plain object.
// Useful for sending full state to a newly joined connection.

// ── Write ─────────────────────────────────────────────────────────

room.state.set<T>(key: string, value: T): void
// Overwrite a value completely.

room.state.update<T>(key: string, fn: (current: T) => T): void
// Functional update. Receives current value, stores returned value.
// Throws if key does not exist — use set() to initialize first.

room.state.patch<T extends object>(key: string, partial: Partial<T>): void
// Shallow-merge a partial object into an existing object.
// Auto-initializes to partial if key does not exist.

// ── Array Operations ──────────────────────────────────────────────

room.state.push<T>(key: string, item: T): void
// Append an item to an array.
// Auto-initializes to [item] if key does not exist.
// Throws if value at key is not an array.

room.state.remove<T>(key: string, predicate: (item: T) => boolean): void
// Remove items from an array matching the predicate.
// No-op if key does not exist. Throws if value is not an array.

// ── Numeric Operations ────────────────────────────────────────────

room.state.increment(key: string, step?: number): void
// Add step to a numeric value (default step: 1).
// Auto-initializes to 0 if key does not exist.
// Throws if value is not a number.

room.state.decrement(key: string, step?: number): void
// Subtract step from a numeric value (default step: 1).
// Auto-initializes to 0 if key does not exist.
// Throws if value is not a number.

// ── Cleanup ───────────────────────────────────────────────────────

room.state.delete(key: string): void
// Remove a key entirely.

room.state.clear(): void
// Remove all keys from this room's state.
```

**Example:**

```typescript
const general = liweb.channel("chat").room("general");

// initialize state when server starts
general.state.set("messages", []);
general.state.set("onlineCount", 0);
general.state.set("config", { maxUsers: 50, theme: "dark" });

// on connection
liweb.on("connection", (ctx) => {
  general.join(ctx.connection);
  general.state.increment("onlineCount");

  // send full history + current state to new joiner
  ctx.send("welcome", {
    id: ctx.connection.id,
    history: general.state.get("messages"),
    onlineCount: general.state.get<number>("onlineCount"),
    config: general.state.get("config"),
    // or send everything at once:
    // fullState: general.state.snapshot(),
  });
});

// on message
liweb.handle("message", (ctx) => {
  const msg = {
    id: ctx.connection.id,
    text: (ctx.payload as any).text,
    ts: Date.now(),
  };

  // persist in room state
  general.state.push("messages", msg);

  // broadcast to room
  general.emit("message", msg);
});

// on disconnect
liweb.on("disconnect", (ctx) => {
  general.leave(ctx.connection);
  general.state.decrement("onlineCount");
  general.emit("user:left", {
    onlineCount: general.state.get("onlineCount"),
  });
});

// update config
liweb.handle("config:update", (ctx) => {
  general.state.patch("config", ctx.payload as object);
  general.emit("config:updated", general.state.get("config"));
});

// remove a specific message
liweb.handle("message:delete", (ctx) => {
  const { msgId } = ctx.payload as { msgId: string };
  general.state.remove("messages", (msg: any) => msg.id === msgId);
  general.emit("message:deleted", { msgId });
});
```

---

### Authentication

Auth is opt-in. When enabled, connections must send a `__auth` event before any other messages are processed.

#### Server setup

```typescript
const liweb = createLiWebServer(httpServer, {
  auth: {
    secret: process.env.APP_SECRET,
    timeout: 5000, // close connection if no __auth within 5s
  },
});

liweb.on("connection", (ctx) => {
  // only fires after successful authentication
  console.log("authenticated:", ctx.user);
  // ctx.user = { id: "u1", name: "Sumeet", role: "admin" }
});

liweb.on("auth:error", (ctx) => {
  // fires when auth fails
  console.log("auth failed:", ctx.payload);
  // { reason: "invalid secret" | "missing auth payload" | "auth timeout" }
});

liweb.handle("message", (ctx) => {
  // ctx.user is always available in handlers after auth
  if (ctx.user?.role !== "admin") {
    ctx.send("error", { reason: "insufficient permissions" });
    return;
  }
  // process admin message
});
```

#### Auth events sent to client

| Event          | When                                          |
| -------------- | --------------------------------------------- |
| `auth:success` | Auth passed — `{ user: { ...secureObject } }` |
| `auth:error`   | Auth failed — `{ reason: string }`            |

---

### Adapter System

liwebjs separates transport from application logic. Swap the adapter without changing any application code.

```typescript
import { createLiWebServer, wsAdapter } from "liwebjs";

// default — uses wsAdapter automatically
const liweb = createLiWebServer(httpServer);

// explicit adapter with ping options
const liweb = createLiWebServer(httpServer, {
  adapter: wsAdapter({
    pingInterval: 30000,
    pingTimeout: 5000,
  }),
});
```

**Custom adapter interface:**

```typescript
interface Adapter {
  attach(
    server: unknown,
    onConnection: (conn: LiWebConnection) => void,
    onMessage: (conn: LiWebConnection, event: string, payload: unknown) => void,
    onClose: (conn: LiWebConnection) => void,
  ): void;
  send(conn: LiWebConnection, event: string, payload: unknown): void;
  close(conn: LiWebConnection): void;
}
```

---

## Complete Example

```typescript
import http from "http";
import express from "express";
import { createLiWebServer } from "liwebjs";

const app = express();
const httpServer = http.createServer(app);

const liweb = createLiWebServer(httpServer, {
  auth: { secret: process.env.APP_SECRET ?? "dev-secret" },
  ping: { pingInterval: 25000, pingTimeout: 10000 },
});

const chat = liweb.channel("chat");
const general = chat.room("general");

// initialize room state
general.state.set("messages", []);
general.state.set("onlineCount", 0);

liweb.on("connection", (ctx) => {
  general.join(ctx.connection);
  general.state.increment("onlineCount");

  ctx.send("welcome", {
    id: ctx.connection.id,
    user: ctx.user,
    onlineCount: general.state.get("onlineCount"),
    history: general.state.get("messages"),
  });

  general.emitExcept(ctx.connection.id, "user:joined", {
    user: ctx.user,
    onlineCount: general.state.get("onlineCount"),
  });
});

liweb.handle("message", (ctx) => {
  const msg = {
    from: ctx.user?.name ?? "anonymous",
    text: (ctx.payload as any).text,
    ts: Date.now(),
  };
  general.state.push("messages", msg);
  general.emit("message", msg);
});

liweb.handle("typing", (ctx) => {
  general.emitExcept(ctx.connection.id, "typing", {
    user: ctx.user?.name,
  });
});

liweb.on("disconnect", (ctx) => {
  general.leave(ctx.connection);
  general.state.decrement("onlineCount");
  general.emit("user:left", {
    user: ctx.user,
    onlineCount: general.state.get("onlineCount"),
  });
});

liweb.on("auth:error", (ctx) => {
  console.warn("auth failed:", ctx.payload);
});

httpServer.listen(3001);
```

---

## Working Example App

See [`examples/chat`](examples/chat) — full-stack chat app with **Express + React + Vite** demonstrating every feature.

```bash
# Terminal 1 — server
cd examples/chat/server
npm install && npm run dev

# Terminal 2 — client
cd examples/chat/client
npm install && npm run dev
```

Open `http://localhost:5173` in multiple tabs.

---

## Project Structure

```
packages/core/
├── src/
│   ├── server.ts              createLiWebServer()
│   ├── connection.ts          LiWebConnection class
│   ├── context.ts             Context interface
│   ├── channel.ts             LiWebChannel class
│   ├── room.ts                LiWebRoom class
│   ├── state.ts               LiWebState class
│   ├── auth.ts                validateAuth() pure function
│   ├── index.ts               public exports
│   └── adapters/
│       ├── adapter.interface.ts
│       └── ws/index.ts        WebSocket adapter
└── src/__tests__/             77 passing tests
```

---

## Roadmap

- [ ] v0.3 — Presence engine (online/offline, last seen)
- [ ] v0.4 — Role-based authorization middleware
- [ ] v1.0 — Redis distributed state adapter (horizontal scaling)
- [ ] Future — uWebSockets adapter, Edge runtime support

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md).

```bash
git clone https://github.com/sumeet57/liwebjs.git
cd liwebjs && npm install
cd packages/core && npm test
```

---

## License

MIT © [Sumeet Umbalkar](https://github.com/sumeet57)
