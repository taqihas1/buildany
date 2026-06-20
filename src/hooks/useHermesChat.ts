"use client";

import { useState, useCallback } from "react";

<<<<<<< HEAD
export interface HermesResponse {
  success: boolean;
  response: string;
  raw: string;
  error?: string;
}

export interface UseHermesChatReturn {
  sendMessage: (query: string, history?: Array<{ role: string; content: string }>) => Promise<HermesResponse>;
  isLoading: boolean;
  error: string | null;
}

export function useHermesChat(): UseHermesChatReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (message: string, history?: Array<{ role: string; content: string }>): Promise<HermesResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/hermes-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            history: history || [],
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        return {
          success: true,
          response: data.reply || data.response || "",
          raw: JSON.stringify(data),
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        return {
          success: false,
          response: "",
          raw: "",
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { sendMessage, isLoading, error };
=======
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
>>>>>>> f7a346fe990de12b26a76a700995fa7435226860
}
