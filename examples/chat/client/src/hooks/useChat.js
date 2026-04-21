import { useEffect, useRef, useState, useCallback } from "react";
import { createLiWebClient } from "../../../../../packages/client/src/index.js";

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
      const { id, onlineCount, history } = payload;
      myIdRef.current = id;
      setState((s) => ({
        ...s,
        myId: id,
        onlineCount,
        messages: (history ?? []).map((m) => ({
          ...m,
          mine: m.id === id,
        })),
      }));
    });

    client.handle("message", (payload) => {
      setState((s) => {
        const isDuplicate = s.messages.some(m => m.ts === payload.ts && m.id === payload.id);
        if (isDuplicate) return s;

        return {
          ...s,
          messages: [
            ...s.messages,
            { ...payload, mine: payload.id === myIdRef.current },
          ],
          typingUsers: s.typingUsers.filter((u) => u !== payload.username),
        };
      });
    });

    client.handle("user:joined", (payload) => {
      setState((s) => ({ ...s, onlineCount: payload.onlineCount }));
    });

    client.handle("user:left", (payload) => {
      setState((s) => ({ ...s, onlineCount: payload.onlineCount }));
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
      if (client.off) {
        client.off("welcome");
        client.off("message");
        client.off("user:joined");
        client.off("user:left");
        client.off("typing");
      }
      client.disconnect();
      clientRef.current = null;
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