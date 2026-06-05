"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Wand2, Search, Layers, Code2, Smartphone, Globe, CheckCircle, Zap } from "lucide-react";

export function PromptBox() {
  const [prompt, setPrompt] = useState("");
  const [appType, setAppType] = useState<"web" | "mobile" | "dashboard">("web");
  const [skipResearch, setSkipResearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<"" | "research" | "generating" | "decomposing">("");
  const [researchPreview, setResearchPreview] = useState<any>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setLoadingStage("research");
    setResearchPreview(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          type: appType, 
          skipResearch 
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("Generation failed:", errorData);
        alert(`Error: ${errorData.error || "Failed to generate"}`);
        setIsLoading(false);
        setLoadingStage("");
        return;
      }
      
      const data = await res.json();

      // Show research results if available
      if (data.research) {
        setLoadingStage("generating");
        setResearchPreview(data.research);
        await new Promise(r => setTimeout(r, 800)); // Brief pause to show research
      }

      setLoadingStage("decomposing");
      await new Promise(r => setTimeout(r, 300));

      if (data.projectId) {
        router.push(`/project/${data.projectId}`);
      } else {
        console.error("No projectId in response:", data);
        alert("Project created but no ID returned. Check console.");
      }
    } catch (err) {
      console.error("Generation failed:", err);
      alert(`Network error: ${err instanceof Error ? err.message : "Failed to connect"}`);
      setIsLoading(false);
      setLoadingStage("");
    }
  };

  const quickPrompts = [
    "A recipe app with high-protein meals and YouTube link storage",
    "A car dealership inventory tracker with search and filters",
    "A stock portfolio dashboard with sparkline charts and news feed",
    "A task manager with team collaboration and calendar sync",
  ];

  const typeIcons = {
    web: Globe,
    mobile: Smartphone,
    dashboard: Layers,
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Type Selector */}
      <div className="flex gap-2 mb-3 justify-center">
        {(["web", "mobile", "dashboard"] as const).map((type) => {
          const Icon = typeIcons[type];
          return (
            <button
              key={type}
              onClick={() => setAppType(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                appType === type
                  ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400"
                  : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          );
        })}
      </div>

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

      {/* Options */}
      <div className="flex items-center justify-between mt-3 px-1">
        <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={skipResearch}
            onChange={(e) => setSkipResearch(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-cyan-500"
          />
          Skip research (faster, less competitive)
        </label>
        <span className="text-xs text-slate-600">
          {appType === "mobile" ? "Expo SDK 54 + React Native" : "Next.js 15 + Tailwind + shadcn/ui"}
        </span>
      </div>

      {/* Loading Status */}
      {isLoading && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              loadingStage === "research" ? "bg-cyan-400 animate-pulse" :
              loadingStage === "generating" || loadingStage === "decomposing" ? "bg-emerald-400" :
              "bg-slate-600"
            }`} />
            <span className={loadingStage === "research" ? "text-cyan-400" : "text-emerald-400"}>
              {loadingStage === "research" && <><Search className="w-3.5 h-3.5 inline mr-1" /> Researching market...</>}
              {loadingStage === "generating" && <><Code2 className="w-3.5 h-3.5 inline mr-1" /> Generating code...</>}
              {loadingStage === "decomposing" && <><Layers className="w-3.5 h-3.5 inline mr-1" /> Planning tasks...</>}
            </span>
          </div>

          {/* Research Preview */}
          {researchPreview && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-cyan-400 mb-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Research completed
              </div>
              <div className="text-xs text-slate-300 max-h-24 overflow-y-auto">
                {researchPreview.content?.slice(0, 300)}...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick prompts */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => setPrompt(p)}
              className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-3 py-1.5 rounded-full hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
            >
              <Wand2 className="w-3 h-3 inline mr-1" />
              {p.length > 40 ? p.slice(0, 40) + "..." : p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
