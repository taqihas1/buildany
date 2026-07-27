"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Sparkles, Utensils, Car, ShoppingBag, Briefcase, Heart } from "lucide-react";

const EXAMPLE_PROJECTS = [
  { icon: Utensils, label: "Recipe App", prompt: "I want to build a recipe app with high-protein meal planner, shopping list, and nutrition tracking" },
  { icon: Car, label: "Car Marketplace", prompt: "I want to build a car buying assistant that compares prices, checks reviews, and finds local dealers" },
  { icon: ShoppingBag, label: "E-commerce Store", prompt: "I want to build a modern e-commerce store with cart, checkout, and admin dashboard" },
  { icon: Briefcase, label: "SaaS Dashboard", prompt: "I want to build a SaaS analytics dashboard with charts, user management, and subscription billing" },
  { icon: Heart, label: "Fitness Tracker", prompt: "I want to build a fitness tracking app with workout plans, progress charts, and social sharing" },
];

export function PromptBox() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e?: React.FormEvent, presetPrompt?: string) => {
    e?.preventDefault();
    
    const currentPrompt = presetPrompt || prompt.trim();
    if (!currentPrompt || isLoading) {
      console.log("[PromptBox] Blocked — empty or loading");
      return;
    }

    console.log("[PromptBox] Submitting:", currentPrompt);
    setPrompt("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/project-chat-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt, type: "web" }),
      });

      const data = await res.json();
      console.log("[PromptBox] API response:", data);

      if (data.success && data.projectId) {
        router.push(`/project/${data.projectId}?prompt=${encodeURIComponent(currentPrompt)}`);
      } else {
        alert(data.error || "Failed to create project");
      }
    } catch (error) {
      console.error("[PromptBox] Submit failed:", error);
      alert("Failed to start. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={(e) => handleSubmit(e)} className="relative">
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-4 py-3 shadow-lg hover:border-purple-300 transition-colors focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100">
          <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="I want to build a..."
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 text-sm"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
        Kelly builds your app with one brain and native tools — preview it in the workspace
      </p>

      {/* Popular Project Examples */}
      <div className="mt-6">
        <p className="text-xs text-gray-400 text-center mb-3">Or start with a popular idea:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_PROJECTS.map((project) => {
            const Icon = project.icon;
            return (
              <button
                key={project.label}
                onClick={() => handleSubmit(undefined, project.prompt)}
                disabled={isLoading}
                className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:shadow-sm transition-all disabled:opacity-50"
              >
                <Icon className="w-3.5 h-3.5" />
                {project.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
