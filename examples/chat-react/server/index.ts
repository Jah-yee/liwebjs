import express from "express";
import { createServer } from "http";
import cors from "cors";
import { createLiWebServer } from "liwebjs"

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", framework: "liwebjs" });
});

const httpServer = createServer(app);
const liweb = createLiWebServer(httpServer);

// ── Channel + Room ─────────────────────────────
const chat = liweb.channel("chat");
const general = chat.room("general");

// initial state
general.state.set("messages", []);

// ── Connection ────────────────────────────────
liweb.on("connection", (c: any) => {
  general.join(c.connection);

  c.send("welcome", {
    id: c.connection.id,
    onlineCount: general.size,
    history: general.state.get("messages"),
  });

  general.emitExcept(c.connection.id, "user:joined", {
    onlineCount: general.size,
  });

  console.log(`[+] ${c.connection.id} connected (${general.size} online)`);
});

liweb.on("disconnect", (c: any) => {
  general.leave(c.connection);

  general.emit("user:left", {
    onlineCount: general.size,
  });

  console.log(`[-] ${c.connection.id} disconnected (${general.size} online)`);
});

// ── Events ────────────────────────────────────

// Send message
liweb.handle("message", (c: any) => {
  const { username, text } = c.payload as { username: string; text: string };

  const message = {
    id: c.connection.id,
    username,
    text,
    ts: Date.now(),
  };

  // save + broadcast
  general.state.push("messages", message);
  general.emit("message", message);

  console.log(`[msg] ${username}: ${text}`);
});

// Typing indicator
liweb.handle("typing", (c: any) => {
  const { username } = c.payload as { username: string };

  general.emitExcept(c.connection.id, "typing", { username });
});

// ── Start ─────────────────────────────────────
const PORT = 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
