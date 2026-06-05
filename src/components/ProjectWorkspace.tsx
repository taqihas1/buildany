'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, GitBranch, Play, Send, FileCode, Folder, Loader2, Smartphone, Globe, Bot, Search, Eye } from 'lucide-react';
import { AIChatPanel } from "./AIChatPanel";
import { SwarmDashboard } from "./SwarmDashboard";
import { ResearchPanel } from "./ResearchPanel";
import { LivePreview } from "./LivePreview";
import { MobilePreview } from "./MobilePreview";

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
  const [rightPanelTab, setRightPanelTab] = useState<'chat' | 'swarm' | 'research' | 'preview' | 'mobile'>('chat');
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
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-medium text-white">{project.name}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {project.type === 'mobile' ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              <span className={project.status === 'ready' ? 'text-green-400' : 'text-yellow-400'}>
                {project.status}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={downloadWeb}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            <Globe className="w-3 h-3" />
            Download Web
          </button>
          <button 
            onClick={downloadMobile}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            <Smartphone className="w-3 h-3" />
            Download Mobile
          </button>
          <button 
            onClick={exportToGitHub}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            <GitBranch className="w-3 h-3" />
            Export to GitHub
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity">
            <Play className="w-3 h-3" />
            Deploy
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree */}
        <div className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
          <div className="p-3 text-xs font-medium text-slate-500 uppercase">Files</div>
          <div className="flex-1 overflow-auto">
            {files.length === 0 ? (
              <div className="p-4 text-sm text-slate-600 text-center">
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
                        ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-500' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <FileCode className="w-4 h-4 shrink-0" />
                    <span className="truncate">{file.path.split('/').pop()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col bg-slate-950">
          {activeFile ? (
            <>
              <div className="h-9 flex items-center px-4 border-b border-slate-800 text-xs text-slate-400">
                <FileCode className="w-3 h-3 mr-2" />
                {activeFile.path}
                <span className="ml-2 text-slate-600">{activeFile.language}</span>
              </div>
              <pre className="flex-1 p-4 overflow-auto text-sm font-mono text-slate-300">
                <code>{activeFile.content}</code>
              </pre>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-600">
              <div className="text-center">
                <Folder className="w-12 h-12 mx-auto mb-3" />
                <p>Select a file to view</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Chat + Swarm Tabs */}
        <div className="w-80 border-l border-slate-800 bg-slate-900/50 flex flex-col">
          {/* Tab Bar */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setRightPanelTab('chat')}
              className={`flex-1 px-3 py-2.5 text-xs font-medium uppercase transition-colors flex items-center justify-center gap-1.5 ${
                rightPanelTab === 'chat'
                  ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Send className="w-3 h-3" />
              AI Assistant
            </button>
            <button
              onClick={() => setRightPanelTab('research')}
              className={`flex-1 px-3 py-2.5 text-xs font-medium uppercase transition-colors flex items-center justify-center gap-1.5 ${
                rightPanelTab === 'research'
                  ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Search className="w-3 h-3" />
              Research
            </button>
            <button
              onClick={() => setRightPanelTab('swarm')}
              className={`flex-1 px-3 py-2.5 text-xs font-medium uppercase transition-colors flex items-center justify-center gap-1.5 ${
                rightPanelTab === 'swarm'
                  ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Bot className="w-3 h-3" />
              Swarm
            </button>
            <button
              onClick={() => setRightPanelTab('preview')}
              className={`flex-1 px-3 py-2.5 text-xs font-medium uppercase transition-colors flex items-center justify-center gap-1.5 ${
                rightPanelTab === 'preview'
                  ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
            <button
              onClick={() => setRightPanelTab('mobile')}
              className={`flex-1 px-3 py-2.5 text-xs font-medium uppercase transition-colors flex items-center justify-center gap-1.5 ${
                rightPanelTab === 'mobile'
                  ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              Mobile
            </button>
          </div>

          {rightPanelTab === 'mobile' ? (
            <MobilePreview projectId={project.id} />
          ) : rightPanelTab === 'preview' ? (
            <LivePreview project={project} files={files} activeFile={activeFile} />
          ) : rightPanelTab === 'chat' ? (
            <>
              <div className="flex-1 overflow-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-sm text-slate-600 text-center py-8">
                    Ask the AI to modify your app...
                  </div>
                )}
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`text-sm p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-cyan-500/10 text-cyan-100 ml-4' 
                        : msg.role === 'assistant'
                        ? 'bg-slate-800 text-slate-300 mr-4'
                        : 'bg-slate-800/50 text-slate-500 text-xs'
                    }`}
                  >
                    <div className="text-xs opacity-50 mb-1">{msg.role} {msg.model && `• ${msg.model}`}</div>
                    {msg.content}
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </div>
                )}
              </div>

              <form onSubmit={handleChat} className="p-3 border-t border-slate-800">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask to modify..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
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
          ) : rightPanelTab === 'research' ? (
            <ResearchPanel projectId={project.id} />
          ) : (
            <SwarmDashboard projectId={project.id} />
          )}
        </div>
      </div>
    </div>
  );
}
