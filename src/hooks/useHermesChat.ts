"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface HermesResponse {
  success: boolean;
  response: string;
  raw: string;
  error?: string;
}

export interface UseHermesChatReturn {
  sendMessage: (query: string, history?: Array<{ role: string; content: string }>, systemPrompt?: string) => Promise<HermesResponse>;
  isLoading: boolean;
  error: string | null;
}

function safeJsonParse(text: string, fallback: any = {}): any {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function useHermesChat(): UseHermesChatReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const inflightCountRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback(
    async (
      message: string, 
      history?: Array<{ role: string; content: string }>,
      systemPrompt?: string
    ): Promise<HermesResponse> => {
      inflightCountRef.current += 1;
      const myRequestId = inflightCountRef.current;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (mountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const response = await fetch("/api/morgan-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            history: history || [],
            systemPrompt, // NEW: Pass custom system prompt
          }),
          signal: abortControllerRef.current.signal,
        });

        if (myRequestId !== inflightCountRef.current) {
          return { success: false, response: "", raw: "", error: "Stale response discarded" };
        }

        const text = await response.text();

        if (myRequestId !== inflightCountRef.current) {
          return { success: false, response: "", raw: "", error: "Stale response discarded" };
        }

        let data: any;
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          data = safeJsonParse(text);
          if (!response.ok && !data.success) {
            throw new Error(data.error || `Hermes error: ${response.status} ${text.slice(0, 200)}`);
          }
        } else {
          data = safeJsonParse(text);
          if (!response.ok && !data.success) {
            throw new Error(`Hermes error: ${response.status} ${text.slice(0, 200)}`);
          }
          if (!data || Object.keys(data).length === 0) {
            data = { reply: text };
          }
        }

        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        if (!mountedRef.current) {
          return { success: false, response: "", raw: "", error: "Component unmounted" };
        }

        return {
          success: true,
          response: data.reply || data.response || data.content || "",
          raw: JSON.stringify(data),
        };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return { success: false, response: "", raw: "", error: "Request cancelled" };
        }
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (mountedRef.current) {
          setError(errorMessage);
        }
        return { success: false, response: "", raw: "", error: errorMessage };
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
        abortControllerRef.current = null;
      }
    },
    []
  );

  return { sendMessage, isLoading, error };
}
