import http from "http";
import { createLiWebServer } from "liwebjs";
import cors from "cors";

// Create HTTP server
const httpServer = http.createServer();
const corsMiddleware = cors({
  origin: "*",
  methods: ["GET", "POST"],
});
httpServer.on("request", corsMiddleware);
// Create LiWeb server with config
const liweb = createLiWebServer(httpServer, {
  auth: {
    secret: "MY_SECRET",
    timeout: 5000,
  },
  ping: {
    pingInterval: 25000,
    pingTimeout: 10000,
  },
});

// Create channel + room
const chatRoom = liweb.channel("chat").room("general");

// ========================
// Connection lifecycle
// ========================

liweb.on("connection", (conn) => {
  const { connection } = conn;
    console.log(`New connection: ${connection.id}`);
  // Join room
  chatRoom.join(connection);

  // Send welcome
  conn.send("welcome", {
    id: connection.id,
  });

  // Notify others
  chatRoom.emitExcept(connection.id, "user:joined", {
    id: connection.id,
  });

  console.log(`User connected: ${connection.id}`);
});

liweb.on("disconnect", (conn) => {
  const { connection } = conn;

  chatRoom.leave(connection);

  chatRoom.emit("user:left", {
    id: connection.id,
  });

  console.log(`User disconnected: ${connection.id}`);
});

liweb.on("auth:error", (conn) => {
  console.log("Auth failed:", conn.error);
});

// ========================
// Chat messaging
// ========================

liweb.handle("chat:send", (conn) => {
  const { connection, payload } = conn;

  const message = {
    id: Date.now(),
    userId: connection.id,
    text: payload.text,
    time: new Date().toISOString(),
  };

  // Save to shared state
  chatRoom.state.push("messages", message);

  // Broadcast to all
  chatRoom.emit("chat:message", message);
});

// ========================
// Typing indicator
// ========================

liweb.handle("chat:typing", (conn) => {
  chatRoom.emitExcept(conn.connection.id, "chat:typing", {
    userId: conn.connection.id,
  });
});

// ========================
// Private message (emitTo)
// ========================

liweb.handle("chat:private", (conn) => {
  const { to, text } = conn.payload;

  chatRoom.emitTo(to, "chat:private", {
    from: conn.connection.id,
    text,
  });
});

// ========================
// Shared state example
// ========================

// Track online users count
liweb.on("connection", () => {
  chatRoom.state.increment("online", 1);
});

liweb.on("disconnect", () => {
  chatRoom.state.decrement("online", 1);
});

// Get full state snapshot
liweb.handle("chat:history", (conn) => {
  conn.send("chat:history", chatRoom.state.snapshot());
});

// ========================
// Start server
// ========================

httpServer.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});

