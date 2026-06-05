import { useState } from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

interface AIChatPanelProps {
  projectId: string;
  type: string;
}

export function AIChatPanel({ projectId, type }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your AI developer. Describe what you want to build, and I'll generate the code for you. For example: 'Create a todo app with categories and due dates'.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add loading message
    const loadingMessage: Message = {
      id: "loading",
      role: "assistant",
      content: "",
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompt: userMessage.content,
          type,
        }),
      });

      const data = await response.json();

      // Remove loading message
      setMessages((prev) => prev.filter((m) => m.id !== "loading"));

      if (data.success) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content:
            data.files.length > 0
              ? `✅ Generated ${data.files.length} files:\n\n${data.files
                  .map((f: { path: string }) => `• ${f.path}`)
                  .join("\n")}\n\n**Tokens used:** ${data.tokensUsed || "N/A"} | **Provider:** ${data.provider}`
              : "I generated the code but couldn't parse it into files. Please try again with a more specific request.",
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `❌ Error: ${data.error || "Generation failed. Please check your API keys in the admin panel."}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      // Remove loading message
      setMessages((prev) => prev.filter((m) => m.id !== "loading"));

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 border-l border-slate-700">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-medium text-white">AI Developer</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="w-7 h-7 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                  : "bg-slate-800 text-slate-200"
              }`}
            >
              {message.isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating code...
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{message.content}</div>
              )}
            </div>
            {message.role === "user" && (
              <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-700 bg-slate-800/50"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your app..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
