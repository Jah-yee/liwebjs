export function StatusBar({ connected, onlineCount, username }) {
  return (
    <header style={{
      padding: "12px 20px",
      borderBottom: "1px solid #222",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: 13,
    }}>
      <span style={{ color: "#00ff88", fontWeight: "bold", letterSpacing: 2 }}>
        LIWEBJS
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#888" }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: connected ? "#00ff88" : "#444",
          display: "inline-block",
          transition: "background 0.3s",
        }} />
        {connected ? `${username}` : "reconnecting..."}
        &nbsp;·&nbsp;
        <span style={{ color: "#00ff88" }}>{onlineCount}</span> online
      </span>
    </header>
  );
}