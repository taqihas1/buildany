"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useHermesChat } from "@/hooks/useHermesChat";
import { Send, Bot, User, Loader2, Sparkles, CheckCircle, AlertCircle, MessageSquare, ArrowRight, Eye, Shield } from "lucide-react";

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
        content: "Hi! I'm Kelly — your AI architect. I can help you build apps, plan projects, generate code, run security audits, and more. What would you like to create today?",
      },
      ...filtered,
    ];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { sendMessage } = useHermesChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const addStatusRef = useRef<((statusType: string, content: string, variant?: "success" | "info" | "warning") => void) | null>(null);
  
  // CRITICAL FIX: Use a submission lock that's independent of render cycles
  const submitLockRef = useRef(false);
  // Track submission count to detect and discard stale responses
  const submitCountRef = useRef(0);
  const swarmAddedRef = useRef(false);
  const codeAddedRef = useRef(false);
  // Use ref for input to avoid recreating handleSubmit on every keystroke
  const inputRef = useRef(input);
  inputRef.current = input;

  // Reset submit lock on unmount to prevent stale locks after StrictMode remount
  useEffect(() => {
    return () => {
      submitLockRef.current = false;
    };
  }, []);

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
    if (tasks.length > 0 && !swarmAddedRef.current) {
      swarmAddedRef.current = true;
      addStatusMessage(
        "swarm",
        `✅ Project has been decomposed into ${tasks.length} tasks. View them in the workspace menu under "Future Release".`,
        "success"
      );
    }
  }, [tasks.length, addStatusMessage]);

  useEffect(() => {
    if (files.length > 0 && !codeAddedRef.current) {
      codeAddedRef.current = true;
      addStatusMessage(
        "code",
        "✅ Code has been generated! In order to see the code, please click on Code in the menu at the top of the workspace.",
        "success"
      );
    }
  }, [files.length, addStatusMessage]);

  // Expose addStatusMessage to parent via window
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__addStatusMessage = addStatusMessage;
    return () => {
      delete w.__addStatusMessage;
    };
  }, [addStatusMessage]);

  // CRITICAL FIX: Robust submission handler with atomic lock
  // Using refs for input/isLoading to avoid recreating callback on every keystroke
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Atomic lock check - prevent any race conditions (StrictMode double-fire, etc.)
    if (submitLockRef.current) {
      console.warn("[Kelly Chat] Submit blocked by lock - duplicate prevented");
      return;
    }
    
    // Read latest values from refs to avoid stale closures
    const currentInputValue = inputRef.current;
    if (!currentInputValue.trim()) return;
    if (isLoadingRef.current) return;
    
    // Lock immediately - this MUST be synchronous to prevent race conditions
    submitLockRef.current = true;
    const currentInput = currentInputValue.trim();
    
    // Increment submission counter to track this specific submission
    submitCountRef.current += 1;
    const mySubmissionId = submitCountRef.current;

    const userMessage: Message = {
      id: getMessageId(),
      role: "user",
      content: currentInput,
    };

    const loadingId = getMessageId();
    const loadingMessage: Message = {
      id: loadingId,
      role: "assistant",
      content: "",
      isLoading: true,
    };

    // Add both messages in one atomic update
    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history from current state
      // Use a ref to get latest messages without closure staleness
      const currentMessages = messagesRef.current;
      const history = currentMessages
        .filter((m) => (m.role === "user" || m.role === "assistant") && !m.isLoading && m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const data = await sendMessage(currentInput, history);

      // CRITICAL: Discard response if a newer submission has occurred
      // This prevents stale responses from overwriting newer ones
      if (mySubmissionId !== submitCountRef.current) {
        console.warn("[Kelly Chat] Discarding stale response from submission", mySubmissionId);
        return;
      }

      // Remove loading message and add response
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => m.id !== loadingId);
        if (data.success || data.projectId) {
          const aiMessage: Message = {
            id: getMessageId(),
            role: "assistant",
            content: data.response || data.reply || "Kelly is ready to help!",
          };
          return [...withoutLoading, aiMessage];
        } else {
          const errorMessage: Message = {
            id: getMessageId(),
            role: "assistant",
            content: `❌ Error: ${data.error || "Kelly connection failed."}`,
          };
          return [...withoutLoading, errorMessage];
        }
      });

    } catch (error) {
      // Only show error if this submission is still the latest
      if (mySubmissionId === submitCountRef.current) {
        setMessages((prev) => {
          const withoutLoading = prev.filter((m) => m.id !== loadingId);
          const errorMessage: Message = {
            id: getMessageId(),
            role: "assistant",
            content: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
          };
          return [...withoutLoading, errorMessage];
        });
      }
    } finally {
      setIsLoading(false);
      // Release lock after a small delay to prevent immediate re-submission
      setTimeout(() => {
        submitLockRef.current = false;
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, type, sendMessage, addStatusMessage, getMessageId]);

  // Track latest messages for history without closure staleness
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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
          <MessageSquare className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-medium text-gray-900">Kelly</h3>
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-50 text-purple-600 border border-purple-200">AI Agent</span>
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
          if (message.role === "system") {
            return <div key={message.id}>{renderStatusMessage(message)}</div>;
          }

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
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 bg-gradient-to-br from-purple-500 to-pink-500">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-cyan-50 text-gray-900 border border-cyan-200 ml-4"
                    : "bg-purple-50 text-gray-800 mr-4 border border-purple-200"
                }`}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Kelly is thinking...
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
            placeholder="Ask Kelly anything..."
            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-cyan-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 bg-gradient-to-r from-purple-500 to-pink-500 flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
