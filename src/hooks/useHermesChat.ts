"use client";

import { useState, useCallback, useRef, useEffect } from "react";

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

/**
 * Safely parse a JSON string, returning a default value on failure.
 * This prevents "Unexpected token" errors from crashing the app.
 */
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
  // Track in-flight request count to prevent race conditions
  const inflightCountRef = useRef(0);

  // Track mount state to prevent state updates after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Abort any in-flight request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback(
    async (message: string, history?: Array<{ role: string; content: string }>): Promise<HermesResponse> => {
      // Increment in-flight counter to detect stale responses
      inflightCountRef.current += 1;
      const myRequestId = inflightCountRef.current;

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (mountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const response = await fetch("/api/hermes-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            history: history || [],
          }),
          signal: abortControllerRef.current.signal,
        });

        // If a newer request has been started, discard this response
        if (myRequestId !== inflightCountRef.current) {
          return { success: false, response: "", raw: "", error: "Stale response discarded" };
        }

        // Read response as text first to handle any content type safely
        const text = await response.text();

        // If a newer request has been started, discard this response
        if (myRequestId !== inflightCountRef.current) {
          return { success: false, response: "", raw: "", error: "Stale response discarded" };
        }

        // Safely parse the response - never assume it's valid JSON
        let data: any;
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          data = safeJsonParse(text);
          // If parsing failed and response is not ok, throw
          if (!response.ok && !data.success) {
            throw new Error(data.error || `Hermes error: ${response.status} ${text.slice(0, 200)}`);
          }
        } else {
          // Non-JSON content type - try to parse anyway, fallback to plain text
          data = safeJsonParse(text);
          if (!response.ok && !data.success) {
            throw new Error(`Hermes error: ${response.status} ${text.slice(0, 200)}`);
          }
          // If parsing failed, treat the raw text as the reply
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
        // Don't treat abort as error
        if (err instanceof DOMException && err.name === "AbortError") {
          return {
            success: false,
            response: "",
            raw: "",
            error: "Request cancelled",
          };
        }
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (mountedRef.current) {
          setError(errorMessage);
        }
        return {
          success: false,
          response: "",
          raw: "",
          error: errorMessage,
        };
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
