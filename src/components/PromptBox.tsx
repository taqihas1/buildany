"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Wand2 } from "lucide-react";

export function PromptBox() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, type: "web" }),
      });
      const data = await res.json();
      if (data.projectId) {
        router.push(`/project/${data.projectId}`);
      }
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "A recipe app with high-protein meals and YouTube link storage",
    "A car dealership inventory tracker with search and filters",
    "A stock portfolio dashboard with sparkline charts and news feed",
    "A task manager with Feishu integration and calendar sync",
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your app... (e.g., 'A fitness tracker with workout plans, progress photos, and social sharing')"
          className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 pr-14 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="absolute bottom-3 right-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        </button>
      </form>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => setPrompt(p)}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-3 py-1.5 rounded-full hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
          >
            <Wand2 className="w-3 h-3 inline mr-1" />
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
