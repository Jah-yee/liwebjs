import express from "express";
import { createServer } from "http";
import cors from "cors";
import { createLiWebServer } from "../../../packages/core/src/index.ts";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Health check — useful for contributors to verify server is up
app.get("/health", (_req, res) => {
  res.json({ status: "ok", framework: "liwebjs" });
});

const httpServer = createServer(app);
const liweb = createLiWebServer(httpServer);

// ── Channel + Room setup ──────────────────────────────────────────
const chat = liweb.channel("chat");
const general = chat.room("general");

// ── Connection lifecycle ──────────────────────────────────────────
liweb.on("connection", (ctx) => {
  general.join(ctx.connection);

  console.log(`[+] ${ctx.connection.id} connected (${general.size} online)`);

  ctx.send("welcome", {
    id: ctx.connection.id,
    onlineCount: general.size,
  });

  general.emitExcept(ctx.connection.id, "user:joined", {
    onlineCount: general.size,
  });
});

liweb.on("disconnect", (ctx) => {
  general.leave(ctx.connection);

  console.log(`[-] ${ctx.connection.id} disconnected (${general.size} online)`);

  general.emit("user:left", {
    onlineCount: general.size,
  });
});

// ── Event handlers ────────────────────────────────────────────────
liweb.handle("message", (ctx) => {
  const { username, text } = ctx.payload as { username: string; text: string };

  console.log(`[msg] ${username}: ${text}`);

  general.emit("message", {
    id: ctx.connection.id,
    username,
    text,
    ts: Date.now(),
  });
});

liweb.handle("typing", (ctx) => {
  const { username } = ctx.payload as { username: string };

  // Broadcast typing indicator to everyone except the typer
  general.emitExcept(ctx.connection.id, "typing", { username });
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`liwebjs chat server running on http://localhost:${PORT}`);
});