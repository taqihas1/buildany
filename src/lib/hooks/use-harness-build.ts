"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface HarnessBuildState {
  status: "idle" | "starting" | "planning" | "coding" | "building" | "completed" | "failed";
  message: string;
  sessionId?: string;
  projectId?: string;
  error?: string;
}

interface UseHarnessBuildOptions {
  onStatusChange?: (status: HarnessBuildState["status"], message: string) => void;
  onComplete?: (projectId: string, files: any[]) => void;
  onError?: (error: string) => void;
  pollInterval?: number;
}

/**
 * React hook for building projects with DeepSeek Harness
 * Replaces the Hermes/Kelly integration
 */
export function useHarnessBuild(options: UseHarnessBuildOptions = {}) {
  const { onStatusChange, onComplete, onError, pollInterval = 3000 } = options;
  const [state, setState] = useState<HarnessBuildState>({
    status: "idle",
    message: "",
  });
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const startBuild = useCallback(async (prompt: string, type: "web" | "mobile" | "backend" = "web") => {
    // Reset state
    setState({ status: "starting", message: "🚀 Starting Harness session..." });
    onStatusChange?.("starting", "🚀 Starting Harness session...");

    try {
      // Step 1: Start Harness session
      const res = await fetch("/api/harness/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, type }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start Harness");
      }

      const data = await res.json();
      const { sessionId, projectId } = data;

      setState({
        status: "planning",
        message: "🧠 Harness is planning your app...",
        sessionId,
        projectId,
      });
      onStatusChange?.("planning", "🧠 Harness is planning your app...");

      // Step 2: Poll for completion
      startPolling(sessionId, projectId);

    } catch (error: any) {
      const msg = error.message || "Build failed to start";
      setState({ status: "failed", message: msg, error: msg });
      onError?.(msg);
    }
  }, [onStatusChange, onError]);

  const startPolling = useCallback((sessionId: string, projectId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/harness/build?sessionId=${sessionId}`);
        if (!res.ok) return;

        const data = await res.json();
        const session = data.session;

        if (!session) return;

        // Map harness status to our state
        const statusMessages: Record<string, string> = {
          starting: "🚀 Harness is starting...",
          planning: "🧠 Planning architecture...",
          coding: "⚡ Generating code...",
          building: "🔨 Building project...",
          completed: "✅ Build complete!",
          failed: "❌ Build failed",
        };

        setState({
          status: session.status,
          message: statusMessages[session.status] || session.status,
          sessionId,
          projectId,
        });
        onStatusChange?.(session.status, statusMessages[session.status] || session.status);

        // If completed or failed, stop polling and fetch files
        if (session.status === "completed" || session.status === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }

          if (session.status === "completed") {
            // Fetch generated files
            const filesRes = await fetch(`/api/project-files?projectId=${projectId}`);
            const filesData = await filesRes.json();
            onComplete?.(projectId, filesData.files || []);
          } else {
            onError?.("Harness build failed. Check logs for details.");
          }
        }
      } catch (err) {
        console.error("[Harness Poll] Error:", err);
      }
    }, pollInterval);
  }, [onStatusChange, onComplete, onError, pollInterval]);

  const cancelBuild = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await fetch(`/api/harness/build?sessionId=${state.sessionId}`, { method: "DELETE" });
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setState({ status: "idle", message: "" });
    } catch (err) {
      console.error("[Harness] Cancel failed:", err);
    }
  }, [state.sessionId]);

  return {
    ...state,
    startBuild,
    cancelBuild,
    isBuilding: state.status !== "idle" && state.status !== "completed" && state.status !== "failed",
  };
}
