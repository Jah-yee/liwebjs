import { useEffect, useRef } from "react";

export function MessageList({ messages, typingUsers }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "16px 20px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {messages.map((msg) => (
        <div key={`${msg.id}-${msg.ts}`} style={{
          maxWidth: "70%",
          alignSelf: msg.mine ? "flex-end" : "flex-start",
          padding: "8px 12px",
          background: msg.mine ? "#003322" : "#1a1a1a",
          borderLeft: `2px solid ${msg.mine ? "#00ff88" : "#333"}`,
          fontSize: 13,
          lineHeight: 1.5,
        }}>
          <div style={{ fontSize: 11, color: msg.mine ? "#00aa55" : "#555", marginBottom: 3 }}>
            {msg.mine ? `${msg.username} (you)` : msg.username}
          </div>
          <div>{msg.text}</div>
        </div>
      ))}

      {typingUsers.length > 0 && (
        <div style={{ alignSelf: "flex-start", fontSize: 11, color: "#555", fontStyle: "italic" }}>
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}