'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send, Loader2, Code2, Play, Folder, FileCode, ChevronRight, ChevronDown,
  GitBranch, RotateCcw, Home, Eye, Hammer, MessageSquare
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Workspace3ColProps {
  project: any;
  initialFiles: FileNode[];
  initialChat: Message[];
  user: any;
}

export function Workspace3Col({ project, initialFiles, initialChat, user }: Workspace3ColProps) {
  const router = useRouter();
  const [chatMessages, setChatMessages] = useState<Message[]>(initialChat);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [files, setFiles] = useState<FileNode[]>(initialFiles);
  const [activeFile, setActiveFile] = useState<{path: string; content: string} | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['src']));
  const [buildStatus, setBuildStatus] = useState<string>(project.status);
  const [isBuilding, setIsBuilding] = useState(false);
  const [gitCommits, setGitCommits] = useState<{hash: string; message: string}[]>([]);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Poll for file updates while creating
  useEffect(() => {
    if (project.status !== 'creating') return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/project-files?projectId=${project.id}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
      // Also check project status
      const statusRes = await fetch(`/api/project-status?projectId=${project.id}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.status !== 'creating') {
          setBuildStatus(statusData.status);
          clearInterval(interval);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [project.id, project.status]);

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isSending) return;
    const msg = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: msg };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/hermes-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: chatMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || data.message || "No response",
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'system', content: 'Error: Failed to get response'
      }]);
    } finally {
      setIsSending(false);
    }
  }, [inputMessage, isSending, chatMessages]);

  const handleBuild = useCallback(async () => {
    setIsBuilding(true);
    try {
      await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      setBuildStatus('building');
      // Poll for completion
      const interval = setInterval(async () => {
        const res = await fetch(`/api/project-status?projectId=${project.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status !== 'building') {
            setBuildStatus(data.status);
            setIsBuilding(false);
            clearInterval(interval);
          }
        }
      }, 5000);
    } catch {
      setIsBuilding(false);
    }
  }, [project.id]);

  const loadGitLog = useCallback(async () => {
    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, action: 'log' }),
      });
      const data = await res.json();
      setGitCommits(data.commits || []);
      setShowGitPanel(!showGitPanel);
    } catch {
      // ignore
    }
  }, [project.id, showGitPanel]);

  const handleFileClick = useCallback(async (filePath: string) => {
    try {
      const res = await fetch(`/api/project-files?projectId=${project.id}&path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
        setActiveFile({ path: filePath, content: data.content });
      }
    } catch {
      // ignore
    }
  }, [project.id]);

  const toggleDir = useCallback((dirPath: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  }, []);

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.path} style={{ paddingLeft: depth * 12 }}>
        {node.type === 'directory' ? (
          <button
            onClick={() => toggleDir(node.path)}
            className="flex items-center gap-1 w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-gray-800 rounded"
          >
            {expandedDirs.has(node.path) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Folder className="w-3 h-3 text-yellow-500" />
            {node.name}
          </button>
        ) : (
          <button
            onClick={() => handleFileClick(node.path)}
            className={`flex items-center gap-1 w-full text-left px-2 py-1 text-xs hover:bg-gray-800 rounded ${
              activeFile?.path === node.path ? 'bg-gray-800 text-purple-400' : 'text-gray-400'
            }`}
          >
            <FileCode className="w-3 h-3 text-blue-400" />
            {node.name}
          </button>
        )}
        {node.type === 'directory' && expandedDirs.has(node.path) && node.children && (
          <div>{renderFileTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="h-12 border-b border-gray-800 flex items-center px-4 gap-4 shrink-0">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white">
          <Home className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">{project.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${
          buildStatus === 'ready' ? 'bg-green-900 text-green-400' :
          buildStatus === 'building' ? 'bg-yellow-900 text-yellow-400' :
          buildStatus === 'creating' ? 'bg-blue-900 text-blue-400' :
          'bg-red-900 text-red-400'
        }`}>
          {buildStatus}
        </span>
        <div className="flex-1" />
        <button
          onClick={loadGitLog}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800"
        >
          <GitBranch className="w-3 h-3" />
          Git
        </button>
        <button
          onClick={handleBuild}
          disabled={isBuilding || buildStatus === 'building'}
          className="flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-3 py-1.5 rounded"
        >
          {isBuilding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Hammer className="w-3 h-3" />}
          {isBuilding ? 'Building...' : 'Build'}
        </button>
      </header>

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Chat */}
        <div className="w-80 border-r border-gray-800 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-gray-800 text-xs font-medium text-gray-400 flex items-center gap-2">
            <MessageSquare className="w-3 h-3" />
            Chat with Morgan
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`text-xs ${
                msg.role === 'user' ? 'text-right' :
                msg.role === 'system' ? 'text-center text-gray-500 italic' :
                'text-left'
              }`}>
                <div className={`inline-block max-w-full px-3 py-2 rounded-lg ${
                  msg.role === 'user' ? 'bg-purple-600 text-white' :
                  msg.role === 'system' ? 'bg-gray-800 text-gray-400' :
                  'bg-gray-800 text-gray-200'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask Morgan..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-500"
              />
              <button
                onClick={sendMessage}
                disabled={isSending || !inputMessage.trim()}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded"
              >
                {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* CENTER: Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-3 py-2 border-b border-gray-800 text-xs font-medium text-gray-400 flex items-center gap-2">
            <Eye className="w-3 h-3" />
            Preview
          </div>
          <div className="flex-1 bg-gray-900 relative">
            {buildStatus === 'ready' ? (
              <iframe
                src={`/api/preview/${project.id}`}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                {buildStatus === 'building' ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-purple-500" />
                    <p className="text-sm">Building your app...</p>
                  </>
                ) : buildStatus === 'creating' ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                    <p className="text-sm">Morgan is generating code...</p>
                  </>
                ) : (
                  <>
                    <Play className="w-8 h-8 mb-4 text-gray-600" />
                    <p className="text-sm">Click "Build" to generate preview</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Files */}
        <div className="w-72 border-l border-gray-800 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-gray-800 text-xs font-medium text-gray-400 flex items-center gap-2">
            <Code2 className="w-3 h-3" />
            Files
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {files.length > 0 ? renderFileTree(files) : (
              <p className="text-xs text-gray-600 p-2">No files yet...</p>
            )}
          </div>
          {activeFile && (
            <div className="h-1/2 border-t border-gray-800 flex flex-col">
              <div className="px-3 py-2 border-b border-gray-800 text-xs text-gray-400 flex items-center justify-between">
                <span className="truncate">{activeFile.path}</span>
                <button onClick={() => setActiveFile(null)} className="text-gray-600 hover:text-white">×</button>
              </div>
              <pre className="flex-1 overflow-auto p-3 text-xs text-gray-300 bg-gray-950">
                <code>{activeFile.content}</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Git Panel Overlay */}
      {showGitPanel && (
        <div className="absolute top-12 right-0 w-80 bg-gray-900 border border-gray-800 shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Git History</span>
            <button onClick={() => setShowGitPanel(false)} className="text-gray-600 hover:text-white">×</button>
          </div>
          {gitCommits.map(commit => (
            <div key={commit.hash} className="px-3 py-2 border-b border-gray-800 hover:bg-gray-800 flex items-center gap-2">
              <span className="text-xs font-mono text-purple-400">{commit.hash}</span>
              <span className="text-xs text-gray-300 truncate">{commit.message}</span>
              <button
                onClick={async () => {
                  await fetch('/api/git', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId: project.id, action: 'revert', message: commit.hash }),
                  });
                  setShowGitPanel(false);
                }}
                className="ml-auto text-xs text-gray-500 hover:text-white"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
