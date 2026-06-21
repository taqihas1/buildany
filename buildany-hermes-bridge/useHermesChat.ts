"use client";

import { useState, useCallback } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface UseHermesChatOptions {
  onError?: (error: string) => void;
}

export function useHermesChat(options: UseHermesChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (query: string, skills?: string[]) => {
      if (!query.trim()) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: query,
        timestamp: new Date(),
      };

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);

      try {
        const response = await fetch("/api/hermes-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            query,
            skills,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to get response from Hermes");
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? { ...msg, content: data.response, isLoading: false }
              : msg
          )
        );

        return data.response;
      } catch (error: any) {
        console.error("Hermes chat error:", error);
        const errorMessage = error.message || "Failed to get response";

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content: `❌ Error: ${errorMessage}`,
                  isLoading: false,
                }
              : msg
          )
        );

        options.onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, options]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
