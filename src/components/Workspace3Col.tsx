"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Code, Play, GitBranch, Folder, FileCode, Loader2, MessageSquare, Cloud, Download, ExternalLink, CheckCircle, Search } from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface DeployLink {
  id: string;
  type: "github" | "cloudflare";
  url: string;
  label: string;
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  type: string;
}

interface Workspace3ColProps {
  project: Project;
  initialFiles: FileNode[];
  initialChat: Message[];
  user: any;
}

export function Workspace3Col({ project, initialFiles, initialChat, user }: Workspace3ColProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialChat);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<FileNode[]>(initialFiles);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [buildStatus, setBuildStatus] = useState<string>(project.status);
  const [deployLinks, setDeployLinks] = useState<DeployLink[]>([]);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-poll for files and status updates when project is generating/completed
  useEffect(() => {
    if (buildStatus !== "creating" && buildStatus !== "generating" && buildStatus !== "building" && buildStatus !== "completed") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        // Poll for files
        const filesRes = await fetch(`/api/project-files?projectId=${project.id}`);
        if (filesRes.ok) {
          const filesData = await filesRes.json();
          if (filesData.files && filesData.files.length > 0) {
            setFiles(filesData.files);
          }
        }

        // Poll for status
        const statusRes = await fetch(`/api/project-status?projectId=${project.id}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status && statusData.status !== buildStatus) {
            setBuildStatus(statusData.status);
            if (statusData.status === deployed) {
              // deploymentUrl is already set by handleDeployCloudflare
            }
          }
        }
      } catch (err) {
        // Silently ignore polling errors
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [buildStatus, project.id]);

  // Load chat history from server on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/project/${project.id}/chat`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages.map((m: { role: string; content: string }) => ({
              id: Math.random().toString(36).substr(2, 9),
              role: m.role,
              content: m.content,
            })));
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    }
    loadHistory();
  }, [project.id]);

  // Auto-send initial prompt if it came from URL
  useEffect(() => {
    if (initialChat.length === 1 && initialChat[0].role === "user") {
      sendMessage(initialChat[0].content, true);
    }
  }, []);

  const isBuildPrompt = (text: string): boolean => {
    const buildKeywords = ['build', 'create', 'make', 'generate', 'app', 'website', 'dashboard', 'tracker', 'portfolio', 'landing page', 'ecommerce', 'blog'];
    const lower = text.toLowerCase();
    return buildKeywords.some(k => lower.includes(k)) && lower.length > 20;
  };

  const sendMessage = async (content: string, isInitial = false) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
    };

    if (!isInitial) {
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
    }
    setIsLoading(true);

    // If this is a build prompt, skip Kelly and go straight to Harness
    if (isBuildPrompt(content)) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "system", content: "🚀 Starting Harness build..." }]);
      setBuildStatus("generating");
      try {
        const res = await fetch("/api/harness/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: content.trim(),
            type: "web",
          }),
        });
        const createData = await res.json();
        if (createData.success && createData.projectId) {
          setMessages((prev) => [...prev, {
            id: Date.now().toString(),
            role: "system",
            content: `✅ App generated via Harness!`,
          }]);
          setBuildStatus("completed");
          router.push("/project/" + createData.projectId);
        } else {
          setMessages((prev) => [...prev, {
            id: Date.now().toString(),
            role: "assistant",
            content: "❌ Generation failed: " + (createData.error || "Unknown error"),
          }]);
          setBuildStatus("error");
        }
      } catch (err) {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "assistant",
          content: "❌ Error: " + (err instanceof Error ? err.message : "Unknown"),
        }]);
        setBuildStatus("error");
      }
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/kelly-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          projectId: project.id,
          history: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", content: `Error: ${data.error}` },
        ]);
      } else if (data.reply || data.response) {
        const kellyResponse = data.reply || data.response;
        const triggerMatch = kellyResponse.match(/\[READY_TO_CREATE:\s*(\{[\s\S]*?\})\s*\]/);
        if (triggerMatch) {
          try {
            const specs = JSON.parse(triggerMatch[1]);
            const cleanResponse = data.reply || data.response.replace(triggerMatch[0], "").trim() || "🚀 Creating your project...";
            setMessages((prev) => [
              ...prev,
              { id: Date.now().toString(), role: "assistant", content: cleanResponse },
            ]);
            (async () => {
              try {
                // Use Morgan for code generation
                const res = await fetch("/api/harness/build", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    prompt: specs.description || "Create project",
                    type: specs.type || "web",
                    appType: specs.type || "web",
                  }),
                });
                const createData = await res.json();
                if (createData.success && createData.projectId) {
                  setMessages((prev) => [...prev, {
                    id: Date.now().toString(),
                    role: "system",
                    content: `✅ App generated via Harness!.`,
                  }]);
                  router.push("/project/" + createData.projectId);
                } else {
                  setMessages((prev) => [...prev, {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: "❌ Generation failed: " + (createData.error || "Unknown error"),
                  }]);
                }
              } catch (err) {
                console.error("[Workspace3Col] Harness generation failed:", err);
                setMessages((prev) => [...prev, {
                  id: Date.now().toString(),
                  role: "assistant",
                  content: "❌ Error: " + (err instanceof Error ? err.message : "Unknown"),
                }]);
              }
            })();
          } catch (e) {
            setMessages((prev) => [
              ...prev,
              { id: Date.now().toString(), role: "assistant", content: kellyResponse },
            ]);
          }
        } else {
          setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), role: "assistant", content: kellyResponse },
          ]);
        }
      }
      // Detect "yes" response when review is pending
      if (reviewData && content.trim().toLowerCase() === "yes") {
        handleFixReview();
        return;
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleBuild = async () => {
    // Check if files exist first
    if (files.length === 0) {
      alert("No code files found. Please chat with Harness to generate code first.");
      return;
    }
    
    setBuildStatus("building");
    try {
      console.log("[Build] Building project:", project.id);
      const buildRes = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const buildData = await buildRes.json();
      console.log("[Build] Build response:", buildData);
      
      // Check for error (API returns { error: "..." } on failure)
      if (buildData.error || buildData.status === "error" || buildData.status === "build_failed") {
        setBuildStatus("build_failed");
        alert("Build failed: " + (buildData.error || buildData.message || "Unknown error"));
        return;
      }
      
      setBuildStatus("built");
      alert("Build complete! Click Deploy to publish to Cloudflare to Cloudflare.");
    } catch (err: any) {
      console.error("[Build] Error:", err);
      setBuildStatus("error");
      alert("Build failed: " + err.message);
    }
  };
  const pollBuildStatus = async () => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/project-status?projectId=${project.id}`);
        const data = await res.json();
        setBuildStatus(data.status);
        if (data.status === "ready" || data.status === "completed" || data.status === "build_failed" || data.status === "error") {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);
  };

  const loadFile = async (path: string) => {
    try {
      const res = await fetch(`/api/project-files?projectId=${project.id}&path=${encodeURIComponent(path)}`);
      const data = await res.json();
      setFileContent(data.content || "");
      setSelectedFile(path);
    } catch {
      setFileContent("// Error loading file");
    }
  };

  const handleDownloadZip = () => {
    const url = `/api/download-zip?projectId=${project.id}`;
    window.open(url, "_blank");
  };

  const handlePushToGitHub = async () => {
    const repoName = prompt("Enter repository name:", project.name.toLowerCase().replace(/\s+/g, "-"));
    if (!repoName) return;
    const token = prompt("Enter GitHub personal access token (or leave empty if set server-side):");
    
    // Add loading message
    const loadingId = Date.now().toString();
    setMessages((prev) => [...prev, {
      id: loadingId,
      role: "system",
      content: "🐙 Pushing to GitHub...",
    }]);
    
    try {
      const res = await fetch("/api/github-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, repoName, token: token || undefined }),
      });
      const data = await res.json();
      
      // Remove loading message
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      
      if (data.success) {
        setDeployLinks((prev) => [...prev, {
          id: Date.now().toString(),
          type: "github",
          url: data.url,
          label: repoName,
        }]);
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "system",
          content: `✅ Code pushed to GitHub! Click the card below to open:`,
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "system",
          content: `❌ GitHub push failed: ${data.error}`,
        }]);
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "system",
        content: `❌ Error: ${err.message}`,
      }]);
    }
  };

  const handleDeployCloudflare = async () => {
    if (files.length === 0) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "system",
        content: "❌ No code files found. Chat with Harness to generate code first.",
      }]);
      return;
    }
    
    const loadingId = Date.now().toString();
    setMessages((prev) => [...prev, {
      id: loadingId,
      role: "system",
      content: "🚀 Deploying to Cloudflare...",
    }]);
    
    try {
      const res = await fetch("/api/deploy/full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, projectName: project.name }),
      });
      const data = await res.json();
      
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      
      if (data.success) {
        setDeployLinks((prev) => [...prev, {
          id: Date.now().toString(),
          type: "cloudflare",
          url: data.url,
          label: project.name,
        }]);
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "system",
          content: `✅ ${data.message}\n\nGitHub: ${data.githubUrl}`,
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "system",
          content: `❌ Deploy failed: ${data.error}`,
        }]);
      }
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "system",
        content: `❌ Deploy error: ${error instanceof Error ? error.message : String(error)}`,
      }]);
    }
  };

  const handleCodeReview = async () => {
    setIsReviewing(true);
    const loadingId = Date.now().toString();
    setMessages((prev) => [...prev, {
      id: loadingId,
      role: "system",
      content: "🔍 Running Ponytail code review...",
    }]);
    try {
      const res = await fetch("/api/code-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      if (data.success) {
        setReviewData(data.review);
        const reviewMsg = `📋 **Code Review Findings**\n\n${data.review}\n\nWant me to fix these issues? Reply **yes** to apply fixes.`;
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "system",
          content: reviewMsg,
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "system",
          content: `❌ Code review failed: ${data.error}`,
        }]);
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "system",
        content: `❌ Error: ${err.message}`,
      }]);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleFixReview = async () => {
    const loadingId = Date.now().toString();
    setMessages((prev) => [...prev, {
      id: loadingId,
      role: "system",
      content: "🔧 Applying Ponytail fixes...",
    }]);
    try {
      const res = await fetch("/api/code-review-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      if (data.success) {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "system",
          content: `✅ Fixed ${data.filesFixed} files!\n\nFiles updated:\n${data.files.join("\n")}\n\nClick **Build** to rebuild with fixes.`,
        }]);
        // Refresh file tree
        const filesRes = await fetch(`/api/project-files?projectId=${project.id}`);
        const filesData = await filesRes.json();
        setFiles(filesData.files || []);
      } else {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "system",
          content: `❌ Fix failed: ${data.error}`,
        }]);
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "system",
        content: `❌ Error: ${err.message}`,
      }]);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <MessageSquare className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-sm">{project.name}</h1>
            <span className="text-xs text-gray-500">{project.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBuild}
            disabled={buildStatus === "building"}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {buildStatus === "building" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Build
          </button>
          <button
            onClick={handleDownloadZip}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-colors"
            title="Download ZIP"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">ZIP</span>
          </button>
          <button
            onClick={handlePushToGitHub}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-colors"
            title="Push to GitHub"
          >
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub</span>
          </button>
          <button
            onClick={handleDeployCloudflare}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-colors"
            title="Deploy to Cloudflare"
          >
            <Cloud className="w-4 h-4" />
            <span className="hidden sm:inline">Deploy</span>
          </button>
          <button
            onClick={handleCodeReview}
            disabled={isReviewing}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            title="Ponytail Code Review"
          >
            {isReviewing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Review</span>
          </button>
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Column */}
        <div className="w-1/3 border-r border-gray-800 flex flex-col">
          <div className="px-4 py-2 border-b border-gray-800 text-xs text-gray-500 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Chat with Harness
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-600 text-sm mt-8">
                <p className="mb-2">Describe what you want to build...</p>
                <p className="text-xs">Harness will research, plan, and generate code for you.</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white"
                      : msg.role === "system"
                      ? "bg-gray-900 border border-gray-700 text-gray-300"
                      : "bg-gray-800 text-gray-200"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {deployLinks.length > 0 && (
              <div className="space-y-2">
                {deployLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.02] ${
                      link.type === "github"
                        ? "bg-gray-900 border-gray-700 hover:border-purple-500"
                        : "bg-orange-950/30 border-orange-900/50 hover:border-orange-500"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      link.type === "github" ? "bg-purple-600/20" : "bg-orange-600/20"
                    }`}>
                      {link.type === "github" ? (
                        <GitBranch className="w-5 h-5 text-purple-400" />
                      ) : (
                        <Cloud className="w-5 h-5 text-orange-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {link.type === "github" ? "GitHub Repository" : "Cloudflare Deployment"}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{link.label}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </a>
                ))}
              </div>
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Harness is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Harness..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-purple-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Files Column */}
        <div className="w-1/3 border-r border-gray-800 flex flex-col">
          <div className="px-4 py-2 border-b border-gray-800 text-xs text-gray-500 flex items-center gap-2">
            <Folder className="w-3.5 h-3.5" />
            Files
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {files.length === 0 ? (
              <p className="text-gray-600 text-sm text-center mt-8">No files yet...</p>
            ) : (
              <FileTree nodes={files} onSelect={loadFile} selectedFile={selectedFile} />
            )}
          </div>
          {selectedFile && (
            <div className="h-1/2 border-t border-gray-800 flex flex-col">
              <div className="px-3 py-1.5 border-b border-gray-800 text-xs text-gray-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileCode className="w-3 h-3" />
                  {selectedFile}
                </span>
                <button onClick={() => setSelectedFile(null)} className="text-gray-600 hover:text-gray-400">×</button>
              </div>
              <pre className="flex-1 overflow-auto p-3 text-xs text-gray-300 bg-gray-950 font-mono">{fileContent}</pre>
            </div>
          )}
        </div>

        {/* Deployment Status Column */}
        <div className="w-1/3 flex flex-col">
          <div className="px-4 py-2 border-b border-gray-800 text-xs text-gray-500 flex items-center gap-2">
            <Cloud className="w-3.5 h-3.5" />
            Live App
          </div>
          <div className="flex-1 bg-gray-900 flex items-center justify-center p-4">
            {buildStatus === "deployed" && deploymentUrl ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-sm text-green-400 font-medium">Deployed!</p>
                <p className="text-xs text-gray-500 mt-2">Your app is live on Cloudflare</p>
                <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" 
                   className="text-xs text-purple-400 hover:text-purple-300 mt-1 block break-all">
                  {deploymentUrl}
                </a>
              </div>
            ) : buildStatus === "deploying" ? (
              <div className="text-center text-gray-500">
                <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-purple-500" />
                <p className="text-sm">Deploying to Cloudflare...</p>
                <p className="text-xs text-gray-600 mt-1">Publishing your app</p>
              </div>
            ) : buildStatus === "building" ? (
              <div className="text-center text-gray-500">
                <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-amber-500" />
                <p className="text-sm">Building app...</p>
                <p className="text-xs text-gray-600 mt-1">Compiling and optimizing</p>
              </div>
            ) : files.length > 0 ? (
              <div className="text-center text-gray-500">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-sm text-blue-400 font-medium">Code Generated!</p>
                <p className="text-xs text-gray-500 mt-2">{files.length} files generated</p>
                <p className="text-xs text-gray-500 mt-1">Click Deploy to publish to Cloudflare</p>
              </div>
            ) : buildStatus === "error" || buildStatus === "build_failed" || buildStatus === "deploy_failed" ? (
              <div className="text-center text-gray-500">
                <X className="w-10 h-10 mx-auto mb-3 text-red-400" />
                <p className="text-sm text-red-400">
                  {buildStatus === "build_failed" ? "Build failed" : 
                   buildStatus === "deploy_failed" ? "Deploy failed" : "Error"}
                </p>
                <p className="text-xs text-gray-600 mt-1">Check chat for details</p>
              </div>
            ) : (
              <div className="text-center text-gray-600">
                <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Start a chat to build your app</p>
                <p className="text-xs text-gray-500 mt-2">Chat with Harness to generate code</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileTree({ nodes, onSelect, selectedFile, depth = 0 }: { nodes: FileNode[]; onSelect: (path: string) => void; selectedFile: string | null; depth?: number }) {
  if (!nodes || nodes.length === 0) return null;
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => {
        // Defensive: derive name from path if missing (handles DB-format data)
        const displayName = node.name || node.path?.split("/").pop() || "unnamed";
        const nodeType = node.type || (node.children ? "directory" : "file");
        return (
          <div key={node.path || displayName}>
            {nodeType === "directory" ? (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
                  <Folder className="w-3 h-3 shrink-0" />
                  <span className="truncate">{displayName}</span>
                </div>
                {node.children && (
                  <FileTree nodes={node.children} onSelect={onSelect} selectedFile={selectedFile} depth={depth + 1} />
                )}
              </div>
            ) : (
              <button
                onClick={() => onSelect(node.path)}
                className={`w-full flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors text-left ${
                  selectedFile === node.path
                    ? "bg-purple-600/20 text-purple-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
              >
                <FileCode className="w-3 h-3 shrink-0" />
                <span className="truncate">{displayName}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}