"use client";

import { useState, useEffect, useRef, useCallback } from "react";
<<<<<<< HEAD
import { useHermesChat } from "@/hooks/useHermesChat";
import { Send, Bot, User, Loader2, Sparkles, CheckCircle, AlertCircle, MessageSquare, ArrowRight, Eye, Shield } from "lucide-react";
=======
import { Send, Bot, User, Loader2, Sparkles, CheckCircle, AlertCircle, MessageSquare, ArrowRight, Zap } from "lucide-react";
import { useHermesChat } from "@/hooks/useHermesChat";
>>>>>>> f7a346fe990de12b26a76a700995fa7435226860

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

export function AIChatPanel({
  projectId,
  type,
  initialMessages = [],
  onStatusClick,
  projectStatus = "draft",
  files = [],
  tasks = [],
}: AIChatPanelProps) {
<<<<<<< HEAD
  // Use refs for counters to avoid hydration mismatches
  const messageIdRef = useRef(0);
  const statusIdRef = useRef(0);
  const getMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return `msg-${messageIdRef.current}`;
  }, []);
  const getStatusId = useCallback((type: string) => {
    statusIdRef.current += 1;
    return `status-${type}-${statusIdRef.current}`;
  }, []);

=======
  const [useHermes, setUseHermes] = useState(false);
>>>>>>> f7a346fe990de12b26a76a700995fa7435226860
  const [messages, setMessages] = useState<Message[]>(() => {
    const filtered = initialMessages
      .filter((m) => {
        if (m.role === 'system' && (m.content?.includes('RESEARCH REPORT') || m.model === 'research-system')) return false;
        if (m.role === 'assistant' && m.content?.includes('```')) return false;
        return true;
      })
      .map((m, index) => ({
        id: m.id || `init-${index}`,
        role: m.role as "user" | "assistant" | "system",
        content: m.content || m.message || "",
      }));
    return [
      {
        id: "welcome",
        role: "assistant",
<<<<<<< HEAD
        content: "Hi! I'm Kelly, your AI assistant. I can help you build apps, plan projects, generate code, and more. What would you like to create today?",
=======
        content: useHermes 
          ? "Hi! I'm Hermes, your AI developer agent. I can help you build, debug, and ship code with structured skills. What do you want to build?"
          : "Hi! I'm your AI developer. Describe what you want to build, and I'll generate the code for you. I'll keep you updated on every step of the process!",
>>>>>>> f7a346fe990de12b26a76a700995fa7435226860
      },
      ...filtered,
    ];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useHermes] = useState(true); // Always use Kelly
  const { sendMessage } = useHermesChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const addStatusRef = useRef<((statusType: string, content: string, variant?: "success" | "info" | "warning") => void) | null>(null);
  const isSubmittingRef = useRef(false);
  const statusAddedRef = useRef<Set<string>>(new Set());

  const { messages: hermesMessages, isLoading: hermesLoading, sendMessage: sendHermesMessage } = useHermesChat();

  const addStatusMessage = useCallback((statusType: string, content: string, variant: "success" | "info" | "warning" = "info") => {
    setMessages(prev => [...prev, {
      id: getStatusId(statusType),
      role: "system",
      content,
      statusType: statusType as Message["statusType"],
      variant,
    }]);
  }, [getStatusId]);

  // Store ref to addStatusMessage for effects
  useEffect(() => {
    addStatusRef.current = addStatusMessage;
  }, [addStatusMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Watch for project status changes and add status messages
  useEffect(() => {
    const addMsg = addStatusRef.current;
    if (!addMsg) return;

    if (tasks.length > 0 && !statusAddedRef.current.has('swarm')) {
      statusAddedRef.current.add('swarm');
      addMsg(
        "swarm",
        `✅ Project has been decomposed into ${tasks.length} tasks. View them in the workspace menu under "Future Release".`,
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

<<<<<<< HEAD
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    const currentInput = input.trim();
=======
  // Sync Hermes messages with local state
  useEffect(() => {
    if (useHermes && hermesMessages.length > 0) {
      // Convert Hermes messages to our format
      const converted = hermesMessages.map(hm => ({
        id: hm.id,
        role: hm.role as "user" | "assistant",
        content: hm.content,
        isLoading: hm.isLoading,
      }));
      setMessages(prev => {
        const userMsgs = prev.filter(m => m.role === "user" || m.role === "system");
        return [...userMsgs, ...converted];
      });
    }
  }, [hermesMessages, useHermes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || hermesLoading) return;
>>>>>>> f7a346fe990de12b26a76a700995fa7435226860

    const userMessage: Message = {
      id: getMessageId(),
      role: "user",
      content: currentInput,
    };

<<<<<<< HEAD
    const loadingId = getMessageId();
=======
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    if (useHermes) {
      // Use Hermes chat
      await sendHermesMessage(userMessage.content);
      return;
    }

    // Use original /api/generate
    setIsLoading(true);

>>>>>>> f7a346fe990de12b26a76a700995fa7435226860
    const loadingMessage: Message = {
      id: loadingId,
      role: "assistant",
      content: "",
      isLoading: true,
    };

    // Add both messages in one update
    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      let data;

      if (useHermes) {
        // Build conversation history from current state
        const history = messages
          .filter((m) => (m.role === "user" || m.role === "assistant") && !m.isLoading && m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content }));

        data = await sendMessage(currentInput, history);
      } else {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            prompt: currentInput,
            type,
          }),
        });
        data = await res.json();
      }

      // Remove loading message and add response
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => m.id !== loadingId);
        if (data.success || data.projectId) {
          const aiMessage: Message = {
            id: getMessageId(),
            role: "assistant",
            content: useHermes
              ? (data.response || data.reply || "Kelly is ready to help!")
              : (data.message || "I've started working on your request. You can track progress in the workspace tabs."),
          };
          return [...withoutLoading, aiMessage];
        } else {
          const errorMessage: Message = {
            id: getMessageId(),
            role: "assistant",
            content: `❌ Error: ${data.error || (useHermes ? "Kelly connection failed." : "Generation failed.")}`,
          };
          return [...withoutLoading, errorMessage];
        }
      });

<<<<<<< HEAD
      // Add status messages for regular AI mode
      if (!useHermes) {
=======
      const data = await response.json();

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

>>>>>>> f7a346fe990de12b26a76a700995fa7435226860
        if (data.research) {
          addStatusMessage("research", "📊 Research complete! Market analysis saved. Click on Research to view.", "success");
        }
        if (data.filesGenerated > 0) {
          addStatusMessage("code", `✅ Code generated! ${data.filesGenerated} files created. Click on "Code" to view.`, "success");
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => m.id !== loadingId);
        const errorMessage: Message = {
          id: getMessageId(),
          role: "assistant",
          content: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
        };
        return [...withoutLoading, errorMessage];
      });
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  }, [input, isLoading, messages, useHermes, projectId, type, sendMessage, addStatusMessage, getMessageId]);

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
<<<<<<< HEAD
=======

>>>>>>> f7a346fe990de12b26a76a700995fa7435226860
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

  const isCodeContent = (content: string): boolean => {
    if (!content) return false;
    if (content.includes('```')) return true;
    if (content.includes('<!DOCTYPE')) return true;
    if (content.includes('<html')) return true;
    if (content.includes('function(') || content.includes('function ')) return true;
    if (content.includes('const ') || content.includes('let ')) return true;
    if (content.length > 500) return true;
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="h-12 border-b border-gray-200 flex items-center px-4 bg-white">
        <div className="flex items-center gap-2">
<<<<<<< HEAD
          <MessageSquare className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-medium text-gray-900">Kelly</h3>
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-50 text-purple-600 border border-purple-200">AI Agent</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
=======
          <MessageSquare className="w-4 h-4 text-cyan-600" />
          <h3 className="text-sm font-medium text-gray-900">
            {useHermes ? "Kelly" : "AI Assistant"}
          </h3>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setUseHermes(!useHermes)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              useHermes 
                ? "bg-purple-100 text-purple-700 hover:bg-purple-200" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title={useHermes ? "Switch to AI Assistant" : "Switch to Hermes Agent"}
          >
            <Zap className="w-3 h-3" />
            {useHermes ? "Hermes" : "AI"}
          </button>
>>>>>>> f7a346fe990de12b26a76a700995fa7435226860
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
          if (message.role === "system") {
            return <div key={message.id}>{renderStatusMessage(message)}</div>;
          }
<<<<<<< HEAD

=======
          
>>>>>>> f7a346fe990de12b26a76a700995fa7435226860
          if (message.role === "assistant" && isCodeContent(message.content)) {
            return null;
          }

          const previewTrigger = message.content?.includes('[PREVIEW_TAB_TRIGGER]');
          const autoTestTrigger = message.content?.includes('[AUTO_TEST_TAB_TRIGGER]');
          const cleanContent = message.content
            ?.replace(/\[PREVIEW_TAB_TRIGGER\]/g, '')
            ?.replace(/\[AUTO_TEST_TAB_TRIGGER\]/g, '')
            ?.trim() || '';

          return (
            <div
              key={message.id}
              className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                  useHermes 
                    ? "bg-gradient-to-br from-purple-500 to-pink-500" 
                    : "bg-gradient-to-br from-cyan-500 to-blue-500"
                }`}>
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-cyan-50 text-gray-900 border border-cyan-200 ml-4"
                    : useHermes
                    ? "bg-purple-50 text-gray-800 mr-4 border border-purple-200"
                    : "bg-gray-100 text-gray-800 mr-4 border border-gray-200"
                }`}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {useHermes ? "Kelly is thinking..." : "Generating code..."}
                  </div>
                ) : (
                  <>
                    <div className="whitespace-pre-wrap">{cleanContent}</div>
                    {(previewTrigger || autoTestTrigger) && onStatusClick && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {previewTrigger && (
                          <button
                            onClick={() => onStatusClick('preview')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition-opacity"
                          >
                            <Eye className="w-3 h-3" />
                            View Preview
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {autoTestTrigger && (
                          <button
                            onClick={() => onStatusClick('testing')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg hover:opacity-90 transition-opacity"
                          >
                            <Shield className="w-3 h-3" />
                            View Test Results
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </>
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
<<<<<<< HEAD
            placeholder="Ask Kelly anything..."
=======
            placeholder={useHermes ? "Ask Kelly anything..." : "Ask the AI to modify your app..."}
>>>>>>> f7a346fe990de12b26a76a700995fa7435226860
            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-cyan-500"
            disabled={isLoading || hermesLoading}
          />
          <button
            type="submit"
<<<<<<< HEAD
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 bg-gradient-to-r from-purple-500 to-pink-500"
=======
            disabled={isLoading || hermesLoading || !input.trim()}
            className={`px-3 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 ${
              useHermes 
                ? "bg-gradient-to-r from-purple-500 to-pink-500" 
                : "bg-gradient-to-r from-cyan-500 to-blue-500"
            }`}
>>>>>>> f7a346fe990de12b26a76a700995fa7435226860
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
