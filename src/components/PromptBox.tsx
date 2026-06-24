"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Sparkles } from "lucide-react";

export function PromptBox() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const currentPrompt = prompt.trim();
    setPrompt("");
    setIsLoading(true);

    try {
      // Create project for chat-first flow — NO generation yet
      const res = await fetch("/api/project-chat-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt, type: "web" }),
      });

      const data = await res.json();

      if (data.success && data.projectId) {
        // Redirect to workspace with prompt for chat flow
        router.push(`/project/${data.projectId}?prompt=${encodeURIComponent(currentPrompt)}`);
      } else {
        alert(data.error || "Failed to create project");
      }
    } catch (error) {
      console.error("Prompt submission failed:", error);
      alert("Failed to start. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-4 py-3 shadow-lg hover:border-purple-300 transition-colors focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100">
          <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="I want to build a..."
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Build
              </>
            )}
          </button>
        </div>
      </form>
      
      <p className="text-center text-xs text-gray-400 mt-2">
        Morgan generates your app instantly — preview it in the workspace
      </p>
    </div>
  );
}
