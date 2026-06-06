'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, GitBranch, Play, Send, FileCode, Folder, Loader2, Smartphone, Globe, Bot, Search, Eye, ChevronLeft, ChevronRight, Home, BookOpen, Trash2 } from 'lucide-react';
import { AIChatPanel } from "./AIChatPanel";
import { SwarmDashboard } from "./SwarmDashboard";
import { ResearchPanel } from "./ResearchPanel";
import { LivePreview } from "./LivePreview";
import { MobilePreview } from "./MobilePreview";
import { WikiViewer } from "./WikiViewer";

interface ProjectWorkspaceProps {
  project: any;
  files: any[];
  chatHistory: any[];
  user: any;
}

export function ProjectWorkspace({ project, files, chatHistory, user }: ProjectWorkspaceProps) {
  const [activeFile, setActiveFile] = useState(files[0] || null);
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState(chatHistory);
  const [leftPanelTab, setLeftPanelTab] = useState<'chat' | 'swarm' | 'research' | 'preview' | 'mobile' | 'wiki'>('chat');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(400); // wider left panel
  const [rightPanelWidth, setRightPanelWidth] = useState(200); // narrower files panel
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const router = useRouter();

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;

    const userMsg = { id: Date.now(), role: 'user', content: chatInput };
    setMessages([...messages, userMsg]);
    setChatInput('');
    setIsGenerating(true);

    try {
      const res = await fetch(`/api/project/${project.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: data.response, model: data.model }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'system', content: 'Error: Failed to get response' }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(200, Math.min(500, e.clientX));
        setLeftPanelWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(200, Math.min(500, window.innerWidth - e.clientX));
        setRightPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };
    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingLeft, isResizingRight]);

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<"" | "building" | "ready" | "error">("");
  const [deployUrl, setDeployUrl] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteProject = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    try {
      const res = await fetch(`/api/projects?id=${project.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.push('/');
      } else {
        alert('Failed to delete: ' + data.error);
      }
    } catch (err) {
      alert('Error deleting project');
    }
  };

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      setDeployStatus("building");
      
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setDeployStatus("ready");
        setDeployUrl(data.downloadUrl);
      } else {
        setDeployStatus("error");
        alert(data.error || 'Deploy failed');
      }
    } catch (err) {
      console.error('Deploy failed:', err);
      setDeployStatus("error");
      alert('Deploy failed. Check console for details.');
    } finally {
      setIsDeploying(false);
    }
  };

  const exportToGitHub = async () => {
    try {
      const res = await fetch('/api/github/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, name: project.name }),
      });
      const data = await res.json();
      if (data.repoUrl) {
        window.open(data.repoUrl, '_blank');
      } else {
        alert('GitHub export not configured. Add a GitHub token in settings.');
      }
    } catch (err) {
      console.error('GitHub export failed:', err);
      alert('GitHub export failed. Check console for details.');
    }
  };

  const downloadWeb = async () => {
    try {
      const res = await fetch(`/api/project/${project.id}/download/web`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Download failed' }));
        alert(data.error || 'No web files available. Generate web code first.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}-web.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Web download failed:', err);
      alert('Web download failed. Check console for details.');
    }
  };

  const downloadMobile = async () => {
    try {
      const res = await fetch(`/api/project/${project.id}/download/mobile`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Download failed' }));
        alert(data.error || 'No mobile files available. Generate mobile code first.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}-mobile.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Mobile download failed:', err);
      alert('Mobile download failed. Check console for details.');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-medium text-gray-900">{project.name}</h1>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {project.type === 'mobile' ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              <span className={project.status === 'ready' ? 'text-green-500' : 'text-yellow-500'}>
                {project.status}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
          <button
            onClick={handleDeleteProject}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button 
            onClick={downloadWeb}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
          >
            <Globe className="w-3 h-3" />
            Download Web
          </button>
          <button 
            onClick={downloadMobile}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
          >
            <Smartphone className="w-3 h-3" />
            Download Mobile
          </button>
          <button 
            onClick={exportToGitHub}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
          >
            <GitBranch className="w-3 h-3" />
            Export to GitHub
          </button>
          {deployStatus === 'ready' && deployUrl && (
            <a 
              href={deployUrl}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-green-50 text-green-600 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
            >
              Download Package
            </a>
          )}
          <button 
            onClick={handleDeploy}
            disabled={isDeploying}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
              deployStatus === 'ready' 
                ? 'bg-green-50 text-green-600 border border-green-200' 
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90'
            } disabled:opacity-50`}
          >
            <Play className="w-3 h-3" />
            {isDeploying ? 'Deploying...' : deployStatus === 'ready' ? 'Deployed' : 'Deploy'}
          </button>
        </div>
      </header>

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-red-600">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Delete Project?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete <span className="font-medium text-gray-900">"{project.name}"</span>? 
              This will permanently delete all files, chat history, and wiki pages. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                className="px-4 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT Panel - AI Chat / Swarm / Research / Preview / Mobile */}
        <div style={{ width: leftPanelCollapsed ? 40 : leftPanelWidth }} className="border-r border-gray-200 bg-gray-50/50 flex flex-col transition-all duration-200">
          {/* Collapse toggle */}
          <button
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="w-full h-8 flex items-center justify-center border-b border-gray-200 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title={leftPanelCollapsed ? "Expand panel" : "Collapse panel"}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${leftPanelCollapsed ? 'rotate-180' : ''}`} />
          </button>
          
          {!leftPanelCollapsed && (
            <>
              {/* Workspace Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Workspace</div>
                {/* Tab Bar */}
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setLeftPanelTab('chat')}
                    className={`px-3 py-1.5 text-xs font-medium uppercase transition-colors rounded-md flex items-center gap-1 ${
                      leftPanelTab === 'chat'
                        ? 'text-cyan-700 bg-cyan-50 border border-cyan-200'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Send className="w-3 h-3" />
                    AI
                  </button>
                  <button
                    onClick={() => setLeftPanelTab('preview')}
                    className={`px-3 py-1.5 text-xs font-medium uppercase transition-colors rounded-md flex items-center gap-1 ${
                      leftPanelTab === 'preview'
                        ? 'text-cyan-700 bg-cyan-50 border border-cyan-200'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    Preview
                  </button>
                  <button
                    onClick={() => setLeftPanelTab('research')}
                    className={`px-3 py-1.5 text-xs font-medium uppercase transition-colors rounded-md flex items-center gap-1 ${
                      leftPanelTab === 'research'
                        ? 'text-cyan-700 bg-cyan-50 border border-cyan-200'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Search className="w-3 h-3" />
                    Research
                  </button>
                  <button
                    onClick={() => setLeftPanelTab('swarm')}
                    className={`px-3 py-1.5 text-xs font-medium uppercase transition-colors rounded-md flex items-center gap-1 ${
                      leftPanelTab === 'swarm'
                        ? 'text-cyan-700 bg-cyan-50 border border-cyan-200'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Bot className="w-3 h-3" />
                    Swarm
                  </button>
                  <button
                    onClick={() => setLeftPanelTab('wiki')}
                    className={`px-3 py-1.5 text-xs font-medium uppercase transition-colors rounded-md flex items-center gap-1 ${
                      leftPanelTab === 'wiki'
                        ? 'text-cyan-700 bg-cyan-50 border border-cyan-200'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <BookOpen className="w-3 h-3" />
                    Wiki
                  </button>
                  {project.type === 'mobile' && (
                    <button
                      onClick={() => setLeftPanelTab('mobile')}
                      className={`px-3 py-1.5 text-xs font-medium uppercase transition-colors rounded-md flex items-center gap-1 ${
                        leftPanelTab === 'mobile'
                          ? 'text-cyan-700 bg-cyan-50 border border-cyan-200'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Smartphone className="w-3 h-3" />
                      Mobile
                    </button>
                  )}
                </div>
              </div>

              {leftPanelTab === 'mobile' || (leftPanelTab === 'preview' && project.type === 'mobile') ? (
                <MobilePreview projectId={project.id} />
              ) : leftPanelTab === 'preview' && project.type !== 'mobile' ? (
                <LivePreview project={project} files={files} activeFile={activeFile} />
              ) : leftPanelTab === 'chat' ? (
                <>
                  <div className="flex-1 overflow-auto p-3 space-y-3">
                    {messages.length === 0 && (
                      <div className="text-base text-gray-400 text-center py-8">
                        Ask the AI to modify your app...
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`text-base p-3 rounded-lg ${
                          msg.role === 'user' 
                            ? 'bg-cyan-50 text-cyan-900 ml-4' 
                            : msg.role === 'assistant'
                            ? 'bg-white border border-gray-200 text-gray-700 mr-4'
                            : 'bg-gray-100 text-gray-500 text-sm'
                        }`}
                      >
                        <div className="text-sm opacity-50 mb-1">{msg.role} {msg.model && `• ${msg.model}`}</div>
                        {msg.content}
                      </div>
                    ))}
                    {isGenerating && (
                      <div className="flex items-center gap-2 text-base text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Thinking...
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleChat} className="p-3 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask to modify..."
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-cyan-500"
                      />
                      <button 
                        type="submit"
                        disabled={isGenerating}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </>
              ) : leftPanelTab === 'research' ? (
                <ResearchPanel projectId={project.id} />
              ) : leftPanelTab === 'swarm' ? (
                <SwarmDashboard projectId={project.id} />
              ) : leftPanelTab === 'wiki' ? (
                <WikiViewer projectId={project.id} />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  Select a tab to view content
                </div>
              )}
            </>
          )}
        </div>

        {/* Resize Handle - Left */}
        <div
          className="w-1 cursor-col-resize hover:bg-cyan-500/50 active:bg-cyan-500 transition-colors z-10"
          onMouseDown={() => setIsResizingLeft(true)}
          title="Drag to resize"
        />

        {/* CENTER - Code Editor */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {activeFile ? (
            <>
              <div className="h-9 flex items-center px-4 border-b border-gray-200 text-sm text-gray-400">
                <FileCode className="w-4 h-4 mr-2" />
                {activeFile.path}
                <span className="ml-2 text-gray-400">{activeFile.language}</span>
              </div>
              <pre className="flex-1 p-4 overflow-auto text-base font-mono text-gray-700">
                <code>{activeFile.content}</code>
              </pre>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Folder className="w-12 h-12 mx-auto mb-3" />
                <p>Select a file to view</p>
              </div>
            </div>
          )}
        </div>

        {/* Resize Handle - Right */}
        <div
          className="w-1 cursor-col-resize hover:bg-cyan-500/50 active:bg-cyan-500 transition-colors z-10"
          onMouseDown={() => setIsResizingRight(true)}
          title="Drag to resize"
        />

        {/* RIGHT Panel - File Tree */}
        <div style={{ width: rightPanelCollapsed ? 40 : rightPanelWidth }} className="border-l border-gray-200 bg-gray-50/50 flex flex-col transition-all duration-200">
          {/* Collapse toggle */}
          <button
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="w-full h-8 flex items-center justify-center border-b border-gray-200 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title={rightPanelCollapsed ? "Expand panel" : "Collapse panel"}
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${rightPanelCollapsed ? 'rotate-180' : ''}`} />
          </button>
          
          {!rightPanelCollapsed && (
            <>
              <div className="p-3 text-sm font-medium text-gray-400 uppercase">Files</div>
              <div className="flex-1 overflow-auto">
                {files.length === 0 ? (
                  <div className="p-4 text-base text-gray-400 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Generating code...
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {files.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => setActiveFile(file)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          activeFile?.id === file.id 
                            ? 'bg-cyan-50 text-cyan-600 border-l-2 border-cyan-500' 
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <FileCode className="w-4 h-4 shrink-0" />
                        <span className="truncate">{file.path.split('/').pop()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
