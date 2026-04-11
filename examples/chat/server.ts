import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createLiWebServer } from "../../packages/core/src/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Track all active connections for broadcasting
const connections = new Set<string>();
const connectionMap = new Map<string, any>();

const httpServer = http.createServer((req, res) => {
  // Serve the client HTML file
  const filePath = path.join(__dirname, "client", "index.html");
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
});

const liweb = createLiWebServer(httpServer);

// Broadcast helper — send an event to every connected client
function broadcast(event: string, payload: unknown, excludeId?: string) {
  for (const [id, conn] of connectionMap.entries()) {
    if (id !== excludeId) {
      conn.send(event, payload);
    }
  }
}

liweb.on("connection", (ctx) => {
  const id = ctx.connection.id;
  connections.add(id);
  connectionMap.set(id, ctx.connection);

  console.log(`[+] connected: ${id} (total: ${connections.size})`);

  // Tell the new client their own id
  ctx.send("welcome", {
    id,
    onlineCount: connections.size,
  });

  // Tell everyone else someone joined
  broadcast(
    "user:joined",
    { id, onlineCount: connections.size },
    id,
  );
});

liweb.handle("message", (ctx) => {
  const payload = ctx.payload as { username: string; text: string };

  console.log(`[msg] ${payload.username}: ${payload.text}`);

  // Broadcast to every connected client including sender
  broadcast("message", {
    id: ctx.connection.id,
    username: payload.username,
    text: payload.text,
    ts: Date.now(),
  });
});

liweb.on("disconnect", (ctx) => {
  const id = ctx.connection.id;
  connections.delete(id);
  connectionMap.delete(id);

  console.log(`[-] disconnected: ${id} (total: ${connections.size})`);

  broadcast("user:left", { id, onlineCount: connections.size });
});

httpServer.listen(3000, () => {
  console.log("liwebjs chat example running at http://localhost:3000");
});