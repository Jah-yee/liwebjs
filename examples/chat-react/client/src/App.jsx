import { useState } from "react";
import { useChat } from "./hooks/useChat.js";
import { StatusBar } from "./components/StatusBar.jsx";
import { MessageList } from "./components/MessageList.jsx";
import { MessageInput } from "./components/MessageInput.jsx";

function Chat({ username }) {
  const { state, sendMessage, sendTyping } = useChat(username);

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <StatusBar
        connected={state.connected}
        onlineCount={state.onlineCount}
        username={username}
      />
      <MessageList
        messages={state.messages}
        typingUsers={state.typingUsers}
      />
      <MessageInput
        onSend={sendMessage}
        onTyping={sendTyping}
        disabled={!state.connected}
      />
    </div>
  );
}

function UsernamePrompt({ onSubmit }) {
  const [name, setName] = useState("");

  return (
    <div style={{
      height: "100dvh", display: "flex", alignItems: "center",
      justifyContent: "center", flexDirection: "column", gap: 16,
    }}>
      <div style={{ color: "#00ff88", fontSize: 24, fontWeight: "bold", letterSpacing: 4 }}>
        LIWEBJS
      </div>
      <div style={{ color: "#555", fontSize: 12 }}>realtime chat example</div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onSubmit(name.trim())}
          placeholder="your username"
          maxLength={20}
          autoFocus
          style={{
            background: "#111", border: "1px solid #333", color: "#e0e0e0",
            padding: "10px 14px", fontFamily: "inherit", fontSize: 13,
            outline: "none", borderRadius: 2, width: 200,
          }}
        />
        <button
          onClick={() => name.trim() && onSubmit(name.trim())}
          style={{
            background: "#00ff88", color: "#0d0d0d", border: "none",
            padding: "10px 20px", fontFamily: "inherit", fontSize: 13,
            fontWeight: "bold", cursor: "pointer", borderRadius: 2,
          }}
        >
          JOIN
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [username, setUsername] = useState(null);

  if (!username) return <UsernamePrompt onSubmit={setUsername} />;
  return <Chat username={username} />;
}