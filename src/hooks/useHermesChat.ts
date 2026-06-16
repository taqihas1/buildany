"use client";

import { useState, useCallback } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export function useHermesChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (query: string, skills?: string[]) => {
    if (!query.trim()) return;

    const userId = Date.now().toString();
    const assistantId = (Date.now() + 1).toString();

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: query, timestamp: new Date() },
      { id: assistantId, role: "assistant", content: "", timestamp: new Date(), isLoading: true }
    ]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/hermes-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          query,
          skills,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");

      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: data.response, isLoading: false } : m));
      return data.response;
    } catch (err: any) {
      const msg = err.message || "Error";
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `❌ Error: ${msg}`, isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, clearMessages };
}
