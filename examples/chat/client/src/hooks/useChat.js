import { useEffect, useRef, useState, useCallback } from "react";
import { createLiWebClient } from "../../../../../packages/client/src/index.js";
// import { createLiWebClient } from "@liwebjs/client";

export function useChat(username) {
  const clientRef = useRef(null);
  const myIdRef = useRef(null);
  const typingTimerRef = useRef(null);

  const [state, setState] = useState({
    connected: false,
    myId: null,
    onlineCount: 0,
    messages: [],
    typingUsers: [],
  });

  useEffect(() => {
    const client = createLiWebClient("ws://localhost:3001");
    clientRef.current = client;

    client.on("connect", () => {
      setState((s) => ({ ...s, connected: true }));
    });

    client.on("disconnect", () => {
      setState((s) => ({ ...s, connected: false }));
    });

    client.handle("welcome", (payload) => {
      const { id, onlineCount } = payload;
      myIdRef.current = id;
      setState((s) => ({ ...s, myId: id, onlineCount }));
    });

    client.handle("message", (payload) => {
      const p = payload;
      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          { ...p, mine: p.id === myIdRef.current },
        ],
        typingUsers: s.typingUsers.filter((u) => u !== p.username),
      }));
    });

    client.handle("user:joined", (payload) => {
      const { onlineCount } = payload;
      setState((s) => ({ ...s, onlineCount }));
    });

    client.handle("user:left", (payload) => {
      const { onlineCount } = payload;
      setState((s) => ({ ...s, onlineCount }));
    });

    client.handle("typing", (payload) => {
      const { username: typingUser } = payload;

      setState((s) => ({
        ...s,
        typingUsers: s.typingUsers.includes(typingUser)
          ? s.typingUsers
          : [...s.typingUsers, typingUser],
      }));

      setTimeout(() => {
        setState((s) => ({
          ...s,
          typingUsers: s.typingUsers.filter((u) => u !== typingUser),
        }));
      }, 2000);
    });

    return () => {
      client.disconnect();
    };
  }, []);

  const sendMessage = useCallback(
    (text) => {
      clientRef.current?.emit("message", { username, text });
    },
    [username]
  );

  const sendTyping = useCallback(() => {
    if (typingTimerRef.current) return;
    clientRef.current?.emit("typing", { username });
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
    }, 1500);
  }, [username]);

  return { state, sendMessage, sendTyping };
}