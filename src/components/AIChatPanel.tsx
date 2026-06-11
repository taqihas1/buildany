import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Bot, User, Loader2, Sparkles, CheckCircle, AlertCircle, MessageSquare, ArrowRight } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  isLoading?: boolean;
  statusType?: "code" | "preview" | "research" | "swarm" | "wiki" | "deploy" | "general";
  variant?: "success" | "info" | "warning";
}

interface RawMessage {
  id?: string;
  role?: string;
  content?: string;
  message?: string;
  model?: string;
}

interface AIChatPanelProps {
  projectId: string;
  type: string;
  initialMessages?: RawMessage[];
  onStatusClick?: (tab: string) => void;
  projectStatus?: string;
  files?: Array<Record<string, unknown>>;
  tasks?: Array<Record<string, unknown>>;
}

let statusCounter = 0;
function getStatusId(type: string): string {
  statusCounter += 1;
  return `status-${type}-${statusCounter}`;
}

let messageCounter = 0;
function getMessageId(): string {
  messageCounter += 1;
  return `msg-${messageCounter}`;
}

export function AIChatPanel({ 
  projectId, 
  type, 
  initialMessages = [], 
  onStatusClick,
  projectStatus = "draft",
  files = [],
  tasks = [],
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const filtered = initialMessages
      .filter((m) => {
        if (m.role === 'system' && (m.content?.includes('RESEARCH REPORT') || m.model === 'research-system')) return false;
        if (m.role === 'assistant' && m.content?.includes('```')) return false;
        return true;
      })
      .map((m) => ({
        id: m.id || getMessageId(),
        role: m.role as "user" | "assistant" | "system",
        content: m.content || m.message || "",
      }));
    return [
      {
        id: "welcome",
        role: "assistant",
        content: "Hi! I'm your AI developer. Describe what you want to build, and I'll generate the code for you. I'll keep you updated on every step of the process!",
      },
      ...filtered,
    ];
  });
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const addStatusRef = useRef<((statusType: string, content: string, variant?: "success" | "info" | "warning") => void) | null>(null);

  const addStatusMessage = useCallback((statusType: string, content: string, variant: "success" | "info" | "warning" = "info") => {
    setMessages(prev => [...prev, {
      id: getStatusId(statusType),
      role: "system",
      content,
      statusType: statusType as Message["statusType"],
      variant,
    }]);
  }, []);

  // Store ref to addStatusMessage for effects
  useEffect(() => {
    addStatusRef.current = addStatusMessage;
  }, [addStatusMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track whether status messages have been added to avoid duplicate messages
  const statusAddedRef = useRef<Set<string>>(new Set());

  // Watch for project status changes and add status messages
  useEffect(() => {
    const addMsg = addStatusRef.current;
    if (!addMsg) return;
    
    if (tasks.length > 0 && !statusAddedRef.current.has('swarm')) {
      statusAddedRef.current.add('swarm');
      addMsg(
        "swarm",
        `✅ Project has been decomposed into ${tasks.length} tasks and assigned to agents. Click on "Agents Swarm" in the workspace menu to view tasks and agents.`,
        "success"
      );
    }
    
    if (files.length > 0 && !statusAddedRef.current.has('code')) {
      statusAddedRef.current.add('code');
      addMsg(
        "code",
        "✅ Code has been generated! In order to see the code, please click on Code in the menu at the top of the workspace.",
        "success"
      );
    }
  }, [files.length, tasks.length]);

  // Expose addStatusMessage to parent via window
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__addStatusMessage = addStatusMessage;
    return () => {
      delete w.__addStatusMessage;
    };
  }, [addStatusMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: getMessageId(),
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

      if (data.success || data.projectId) {
        const aiMessage: Message = {
          id: getMessageId(),
          role: "assistant",
          content: data.message || 
            (data.filesGenerated 
              ? `✅ Generated ${data.filesGenerated} files! The project is ready. Check the Code tab or Preview tab to see your app.`
              : "I've started working on your request. You can track progress in the workspace tabs."),
        };
        setMessages((prev) => [...prev, aiMessage]);

        // Add status messages for each completed phase
        if (data.research) {
          addStatusMessage("research", "📊 Research complete! Market analysis and competitor research has been saved. Click on Research to view.", "success");
        }
        if (data.filesGenerated > 0) {
          addStatusMessage("code", `✅ Code has been generated! ${data.filesGenerated} files created. Click on "Code" in the workspace menu to view the files.`, "success");
        }
        if (data.tasksCreated > 0) {
          addStatusMessage("swarm", `✅ Project decomposed into ${data.tasksCreated} tasks and assigned to agents. Click on "Agents Swarm" to view tasks and execution order.`, "success");
        }
      } else {
        const errorMessage: Message = {
          id: getMessageId(),
          role: "assistant",
          content: `❌ Error: ${data.error || "Generation failed. Please check your API keys in the admin panel."}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== "loading"));

      const errorMessage: Message = {
        id: getMessageId(),
        role: "assistant",
        content: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusMessage = (msg: Message) => {
    const isSuccess = msg.variant === "success";
    const isWarning = msg.variant === "warning";
    const tabMap: Record<string, string> = {
      code: "code",
      preview: "preview",
      research: "research",
      swarm: "swarm",
      wiki: "wiki",
      deploy: "deploy",
    };
    const tabName = msg.statusType ? tabMap[msg.statusType] : null;

    // Strip markdown bold for cleaner display
    const cleanContent = msg.content?.replace(/\*\*/g, '') || '';

    return (
      <div className={`p-3 rounded-lg border text-xs ${
        isSuccess 
          ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
          : isWarning 
          ? "bg-amber-50 border-amber-200 text-amber-700"
          : "bg-blue-50 border-blue-200 text-blue-700"
      }`}>
        <div className="flex items-start gap-2">
          {isSuccess ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : 
           isWarning ? <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : 
           <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
          <div className="flex-1">
            <div className="whitespace-pre-wrap">{cleanContent}</div>
            {tabName && onStatusClick && (
              <button
                onClick={() => onStatusClick(tabName)}
                className="mt-1.5 text-xs text-cyan-600 hover:text-cyan-700 underline underline-offset-2 flex items-center gap-1"
              >
                Click to view <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Filter out assistant messages that contain raw code (should be in Code tab, not chat)
  const isCodeContent = (content: string): boolean => {
    if (!content) return false;
    // Check for code block indicators
    if (content.includes('```')) return true;
    if (content.includes('<!DOCTYPE')) return true;
    if (content.includes('<html')) return true;
    if (content.includes('function(') || content.includes('function ')) return true;
    if (content.includes('const ') || content.includes('let ')) return true;
    // Check if it's very long (likely code)
    if (content.length > 500) return true;
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="h-12 border-b border-gray-200 flex items-center px-4 bg-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-600" />
          <h3 className="text-sm font-medium text-gray-900">AI Assistant</h3>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${
            projectStatus === "ready" ? "bg-emerald-400" : 
            projectStatus === "generating" ? "bg-amber-400 animate-pulse" : 
            "bg-gray-400"
          }`} />
          <span className="text-xs text-gray-500 capitalize">{projectStatus}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((message) => {
          // Skip system messages and code-containing assistant messages
          if (message.role === "system") {
            return <div key={message.id}>{renderStatusMessage(message)}</div>;
          }
          
          // Skip assistant messages that contain raw code (should be in Code tab)
          if (message.role === "assistant" && isCodeContent(message.content)) {
            return null;
          }

          return (
            <div
              key={message.id}
              className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-cyan-50 text-gray-900 border border-cyan-200 ml-4"
                    : "bg-gray-100 text-gray-800 mr-4 border border-gray-200"
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
                <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-gray-200"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the AI to modify your app..."
            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-cyan-500"
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
