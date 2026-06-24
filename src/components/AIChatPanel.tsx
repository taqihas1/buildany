"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useHermesChat } from "@/hooks/useHermesChat";
import { Send, Bot, User, Loader2, Sparkles, CheckCircle, AlertCircle, MessageSquare, ArrowRight, Eye, Shield, Wand2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  isLoading?: boolean;
  statusType?: "code" | "preview" | "research" | "swarm" | "wiki" | "deploy" | "general" | "creating";
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
  projectId?: string;
  type?: string;
  initialMessages?: RawMessage[];
  onStatusClick?: (tab: string) => void;
  projectStatus?: string;
  files?: Array<Record<string, unknown>>;
  tasks?: Array<Record<string, unknown>>;
  initialPrompt?: string; // NEW: For prompt box flow
  onProjectCreated?: (projectId: string) => void; // NEW: Callback when project created
}

// NEW: System prompt for the "Magical" flow — tells Kelly to ask clarifying questions
const KELLY_MAGIC_PROMPT = `You are Kelly, the AI architect for BuildAny. Your job is to understand what the user wants to build BEFORE creating anything.

RULES:
1. Ask clarifying questions until you fully understand the user's vision
2. Ask about: target audience, key features, platform (web/mobile), design preferences, complexity level
3. Be conversational and friendly — you're a creative partner, not a form
4. Once you have enough information, respond with a trigger:
   [READY_TO_CREATE: {"projectName": "Name", "type": "web|mobile", "description": "...", "features": ["..."], "targetAudience": "..."}]
5. ONLY use the trigger when you're confident you understand the project
6. If the user is vague, ask 1-2 questions at a time, not all at once

Example conversation:
User: "I want a fitness app"
Kelly: "Great idea! What type of fitness — workout tracking, diet planning, or both?"
User: "Workout tracking with social features"
Kelly: "Love it! Should it include progress charts, exercise library, and friend challenges?"
User: "Yes, all of that!"
Kelly: "Perfect! I'll create your project now. 🚀 [READY_TO_CREATE: {...}]"`;

export function AIChatPanel({
  projectId,
  type,
  initialMessages = [],
  onStatusClick,
  projectStatus = "draft",
  files = [],
  tasks = [],
  initialPrompt, // NEW
  onProjectCreated, // NEW
}: AIChatPanelProps) {
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
    const msgs: Message[] = [
      {
        id: "welcome",
        role: "assistant",
        content: "Hi! I'm Morgan — your AI architect. Tell me what you want to build and I'll ask a few questions to make sure we get it right. What would you like to create?",
      },
    ];

    // If there's an initial prompt from the prompt box, add it
    if (initialPrompt) {
      msgs.push({
        id: "init-prompt",
        role: "user",
        content: initialPrompt,
      });
    }

    return msgs;
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false); // NEW
  const { sendMessage } = useHermesChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const addStatusRef = useRef<((statusType: string, content: string, variant?: "success" | "info" | "warning") => void) | null>(null);
  
  const submitLockRef = useRef(false);
  const submitCountRef = useRef(0);
  const inputRef = useRef(input);
  inputRef.current = input;

  // NEW: Auto-send initial prompt if provided
  useEffect(() => {
    if (initialPrompt && messages.length === 2) {
      // We have welcome + initial prompt, now send to Kelly
      handleAutoSubmit(initialPrompt);
    }
  }, [initialPrompt]);

  // NEW: Auto-submit handler for initial prompt
  const handleAutoSubmit = async (prompt: string) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsLoading(true);

    try {
      const history = [{ role: "user" as const, content: prompt }];
      
      // Add loading message
      const loadingId = getMessageId();
      setMessages(prev => [...prev, {
        id: loadingId,
        role: "assistant",
        content: "",
        isLoading: true,
      }]);

      const data = await sendMessage(prompt, history, KELLY_MAGIC_PROMPT);

      // Remove loading and add response
      setMessages(prev => {
        const withoutLoading = prev.filter(m => m.id !== loadingId);
        
        // Check for trigger
        const triggerMatch = data.response?.match(/\[READY_TO_CREATE:\s*(\{[\s\S]*?\})\s*\]/);
        if (triggerMatch) {
          // Extract specs and create project
          const specs = JSON.parse(triggerMatch[1]);
          createProject(specs);
          
          return [...withoutLoading, {
            id: getMessageId(),
            role: "assistant",
            content: `✨ ${data.response.replace(triggerMatch[0], "").trim() || "Perfect! I'm creating your project now..."}`,
          }];
        }

        return [...withoutLoading, {
          id: getMessageId(),
          role: "assistant",
          content: data.response || "I'm ready to help! What would you like to build?",
        }];
      });
    } catch (error) {
      console.error("Auto-submit error:", error);
    } finally {
      setIsLoading(false);
      submitLockRef.current = false;
    }
  };

  // NEW: Create project from specs
  const createProject = async (specs: any) => {
    setIsCreatingProject(true);
    try {
      const res = await fetch("/api/hermes-orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: specs.description || "Create project",
          appType: specs.type || "web",
          provider: "deepseek",
          skipResearch: false,
        }),
      });

      const data = await res.json();
      if (data.success && data.projectId) {
        setMessages(prev => [...prev, {
          id: getStatusId("creating"),
          role: "system",
          content: `🚀 Project "${data.projectName}" created successfully!`,
          statusType: "creating",
          variant: "success",
        }]);

        if (onProjectCreated) {
          onProjectCreated(data.projectId);
        }
      }
    } catch (error) {
      console.error("Project creation failed:", error);
      setMessages(prev => [...prev, {
        id: getStatusId("creating"),
        role: "system",
        content: "❌ Failed to create project. Please try again.",
        statusType: "creating",
        variant: "warning",
      }]);
    } finally {
      setIsCreatingProject(false);
    }
  };

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

  useEffect(() => {
    addStatusRef.current = addStatusMessage;
  }, [addStatusMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitLockRef.current) return;
    const currentInputValue = inputRef.current;
    if (!currentInputValue.trim()) return;
    if (isLoading) return;
    
    submitLockRef.current = true;
    const currentInput = currentInputValue.trim();
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

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const currentMessages = messagesRef.current;
      const history = currentMessages
        .filter((m) => (m.role === "user" || m.role === "assistant") && !m.isLoading && m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const data = await sendMessage(currentInput, history, KELLY_MAGIC_PROMPT);

      if (mySubmissionId !== submitCountRef.current) return;

      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => m.id !== loadingId);
        console.log("[AIChatPanel] handleSubmit response:", data.success, data.response?.substring(0, 100));
        
        // Check for READY_TO_CREATE trigger
        const triggerMatch = data.response?.match(/\[READY_TO_CREATE:\s*(\{[\s\S]*?\})\s*\]/);
        if (triggerMatch) {
          const specs = JSON.parse(triggerMatch[1]);
          createProject(specs);
          
          return [...withoutLoading, {
            id: getMessageId(),
            role: "assistant",
            content: `✨ ${data.response.replace(triggerMatch[0], "").trim() || "Perfect! I'm creating your project now..."}`,
          }];
        }

        if (data.success || data.projectId) {
          return [...withoutLoading, {
            id: getMessageId(),
            role: "assistant",
            content: data.response || data.reply || "Morgan is ready to help!",
          }];
        } else {
          return [...withoutLoading, {
            id: getMessageId(),
            role: "assistant",
            content: `❌ Error: ${data.error || "Morgan connection failed."}`,
          }];
        }
      });

    } catch (error) {
      if (mySubmissionId === submitCountRef.current) {
        setMessages((prev) => {
          const withoutLoading = prev.filter((m) => m.id !== loadingId);
          return [...withoutLoading, {
            id: getMessageId(),
            role: "assistant",
            content: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
          }];
        });
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        submitLockRef.current = false;
      }, 100);
    }
  }, [sendMessage, getMessageId]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // ... rest of the component (renderStatusMessage, isCodeContent, return JSX) stays the same
  // For brevity, I'll include the key parts:

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
      creating: "preview",
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
    const result = content.includes('```') || content.includes('<!DOCTYPE') || content.includes('<html');
    if (result) console.log("[AIChatPanel] Filtering code content:", content.substring(0, 50));
    return result;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="h-12 border-b border-gray-200 flex items-center px-4 bg-white">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-medium text-gray-900">Morgan</h3>
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-50 text-purple-600 border border-purple-200">AI Builder</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {isCreatingProject && (
            <span className="text-xs text-purple-600 animate-pulse">Creating...</span>
          )}
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
                    Morgan is thinking...
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
            placeholder="Ask Morgan anything..."
            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-cyan-500"
            disabled={isLoading || isCreatingProject}
          />
          <button
            type="submit"
            disabled={isLoading || isCreatingProject || !input.trim()}
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
