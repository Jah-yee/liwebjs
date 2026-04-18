import { useState } from "react";

export function MessageInput({ onSend, onTyping, disabled }) {
  const [text, setText] = useState("");

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <footer style={{
      borderTop: "1px solid #222", padding: "12px 20px",
      display: "flex", gap: 10,
    }}>
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); onTyping(); }}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="type a message..."
        maxLength={300}
        disabled={disabled}
        style={{
          flex: 1, background: "#111", border: "1px solid #333",
          color: "#e0e0e0", padding: "10px 14px",
          fontFamily: "inherit", fontSize: 13, outline: "none",
          borderRadius: 2,
        }}
        autoFocus
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        style={{
          background: disabled || !text.trim() ? "#333" : "#00ff88",
          color: disabled || !text.trim() ? "#666" : "#0d0d0d",
          border: "none", padding: "10px 20px",
          fontFamily: "inherit", fontSize: 13, fontWeight: "bold",
          cursor: disabled ? "not-allowed" : "pointer",
          borderRadius: 2, letterSpacing: 1,
        }}
      >
        SEND
      </button>
    </footer>
  );
}