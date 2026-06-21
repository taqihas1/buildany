"use client";

import { useState, useEffect } from "react";
import { Sparkles, Brain, MessageCircle, Wand2, Search, FileText, Code2, Layers } from "lucide-react";

const KELLY_MESSAGES = [
  "👋 Hi! I'm Kelly, your AI architect.",
  "Describe your app idea and I'll research, plan, and build it for you.",
  "I can build web apps, mobile apps, and dashboards.",
];

const KELLY_SKILLS = [
  { icon: Search, label: "Market Research", desc: "Study top apps in your space" },
  { icon: FileText, label: "Wiki Generation", desc: "Auto-generated documentation" },
  { icon: Layers, label: "Task Planning", desc: "Decompose into actionable tasks" },
  { icon: Code2, label: "Code Generation", desc: "Full-stack app code" },
  { icon: Wand2, label: "Code Review", desc: "AI-powered quality checks" },
  { icon: Brain, label: "Architecture", desc: "Smart design decisions" },
];

export function KellyWelcomePanel({ onStart }: { onStart?: () => void }) {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (visibleMessages < KELLY_MESSAGES.length) {
        setVisibleMessages((prev) => prev + 1);
      } else {
        setIsTyping(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [visibleMessages]);

  return (
    <div className="bg-gradient-to-br from-purple-50 via-white to-cyan-50 border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
      {/* Kelly Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
            🤖
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">Kelly</h3>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              AI Architect
            </span>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Online
            </span>
          </div>
          <p className="text-sm text-gray-500">Powered by Hermes + 37 skills</p>
        </div>
      </div>

      {/* Kelly Messages */}
      <div className="space-y-2 mb-4">
        {KELLY_MESSAGES.slice(0, visibleMessages).map((msg, i) => (
          <div
            key={i}
            className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 shadow-sm animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {msg}
          </div>
        ))}
        {isTyping && visibleMessages < KELLY_MESSAGES.length && (
          <div className="flex items-center gap-2 text-gray-400 text-sm px-4 py-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            Kelly is thinking...
          </div>
        )}
      </div>

      {/* Kelly Skills */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {KELLY_SKILLS.map((skill) => {
          const Icon = skill.icon;
          return (
            <div
              key={skill.label}
              className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2 hover:border-purple-200 transition-colors cursor-default"
            >
              <Icon className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-xs font-medium text-gray-700">{skill.label}</div>
                <div className="text-[10px] text-gray-400">{skill.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Button */}
      <button
        onClick={onStart}
        className="mt-4 w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Start Building with Kelly
      </button>
    </div>
  );
}
