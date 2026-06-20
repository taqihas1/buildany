"use client";

import { useState, useCallback } from "react";

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
}
