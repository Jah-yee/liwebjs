<div align="center">

# LiWebJS

**Realtime backend framework for Node.js**

Structured WebSocket abstraction with channels, rooms, shared state, and authentication built-in.

[![npm version](https://img.shields.io/npm/v/liwebjs)](https://www.npmjs.com/package/liwebjs)
[![license](https://img.shields.io/npm/l/liwebjs)](LICENSE)
[![tests](https://img.shields.io/github/actions/workflow/status/sumeet57/liwebjs/ci.yml?label=tests)](https://github.com/sumeet57/liwebjs/actions)

</div>

---

## Why LiWebJS?

Most realtime apps end up re-implementing the same primitives:

* Connection lifecycle management
* Room / channel systems
* State synchronization
* Authentication & heartbeats

LiWebJS promotes these to first-class concepts so you write application logic — not infrastructure.

| Raw WebSocket          | LiWebJS                            |
| ---------------------- | ---------------------------------- |
| `ws.on("message", fn)` | `liweb.handle("chat:message", fn)` |
| Manual room tracking   | `channel("chat").room("general")`  |
| Custom auth handling   | Built-in auth config               |
| Manual state sync      | `room.state.*` APIs                |

---

## Packages

| Package          | Description                  |
| ---------------- | ---------------------------- |
| `liwebjs`        | Server-side framework        |
| `liwebjs-client` | Browser WebSocket client SDK |

---

## Quick Start

### Server

```bash
npm install liwebjs
```

```ts
import http from "http";
import { createLiWebServer } from "liwebjs";

const httpServer = http.createServer();
const liweb = createLiWebServer(httpServer);

const general = liweb.channel("chat").room("general");

liweb.on("connection", (ctx) => {
  general.join(ctx.connection);
  ctx.send("welcome", { id: ctx.connection.id });
});

liweb.handle("message", (ctx) => {
  general.emit("message", ctx.payload);
});

liweb.on("disconnect", (ctx) => {
  general.leave(ctx.connection);
});

httpServer.listen(3001);
```

---

### Client

```bash
npm install liwebjs-client
```

```ts
import { createLiWebClient } from "liwebjs-client";

const client = createLiWebClient("ws://localhost:3001");

client.on("connect", () => console.log("connected"));

client.handle("message", (payload) => {
  console.log(payload);
});

client.emit("message", { text: "hello world" });
```

---

## Core Features

| Feature        | API                               |
| -------------- | --------------------------------- |
| Event routing  | `liweb.handle(event, fn)`         |
| Channels       | `liweb.channel(name)`             |
| Rooms          | `channel.room(key)`               |
| Broadcasting   | `room.emit / emitExcept / emitTo` |
| Shared state   | `room.state.*`                    |
| Authentication | `options.auth`                    |
| Heartbeat      | `options.ping`                    |
| Auto-reconnect | Client SDK                        |

---

## Example

A complete chat application is available:

```bash
# Server
cd examples/chat/server
npm install
npm run dev

# Client
cd examples/chat/client
npm install
npm run dev
```

Open: http://localhost:5173

---

## API Overview

### Server

```ts
createLiWebServer(httpServer, {
  auth: { secret: "APP_SECRET", timeout: 5000 },
  ping: { pingInterval: 25000, pingTimeout: 10000 },
});

liweb.on("connection" | "disconnect" | "auth:error", handler);

liweb.handle(eventName, handler);

const channel = liweb.channel(name);
const room = channel.room(key);

// Room control
room.join(conn);
room.leave(conn);
room.has(conn);

// Messaging
room.emit(event, payload);
room.emitExcept(connId, event, payload);
room.emitTo(connId, event, payload);

// State
room.state.get();
room.state.set();
room.state.update();
room.state.push();
room.state.remove();
room.state.increment();
room.state.decrement();
room.state.patch();
room.state.snapshot();
```

---

### Client

```ts
createLiWebClient(url, {
  reconnect: true,
  reconnectDelay: 2000,
  auth: { secret, secure: { id, role } },
});

client.on("connect" | "disconnect", handler);

client.handle(eventName, handler);

client.emit(eventName, payload);

client.auth({ secret, secure });

client.disconnect();
```

---

## Project Structure

```
liwebjs/
├── packages/
│   ├── core/        # Server framework
│   └── client/      # Browser SDK
├── examples/
│   └── chat/        # Full-stack example
└── DOCUMENTATION.md
```

---

## Development

```bash
git clone https://github.com/sumeet57/liwebjs.git
cd liwebjs
npm install

# Run tests
cd packages/core && npm test
cd ../client && npm test
```


---

## When NOT to Use LiWebJS

* You need ultra-low latency at scale (consider raw ws or uWebSockets)
* You already rely heavily on Socket.IO ecosystem
* You don’t need structured realtime (simple pub/sub is enough)

---

## License

MIT © Sumeet Umbalkar
