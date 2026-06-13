'use client';

import { useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';
import {
  Code2, GitBranch, Play, Send, FileCode, Folder, Loader2,
  Smartphone, Globe, Bot, Search, Eye, Shield, BookOpen, Layers,
  ArrowRight, AlertTriangle, CheckCircle, Trash2, Home,
  ChevronLeft, ChevronRight, MessageSquare
} from 'lucide-react';
import { AIChatPanel } from "./AIChatPanel";
import { SwarmDashboard } from "./SwarmDashboard";
import { ResearchPanel } from "./ResearchPanel";
import { LivePreview } from "./LivePreview";
import { MobilePreview } from "./MobilePreview";
import { WikiViewer } from "./WikiViewer";
import CodeReviewPanel from "./CodeReviewPanel";

type WorkspaceTab = 'preview' | 'code' | 'research' | 'swarm' | 'wiki' | 'review';

interface ProjectWorkspaceProps {
  project: any;
  files: any[];
  chatHistory: any[];
  tasks: any[];
  user: any;
}

export function ProjectWorkspace({ project, files, chatHistory, tasks, user }: ProjectWorkspaceProps) {
  const [activeFile, setActiveFile] = useState(files[0] || null);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('preview');
  const [leftPanelWidth, setLeftPanelWidth] = useState(340);
  const [rightPanelWidth, setRightPanelWidth] = useState(240);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deployInfo, setDeployInfo] = useState<any>(null);
  const router = useRouter();

  // Resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(280, Math.min(480, e.clientX));
        setLeftPanelWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(180, Math.min(400, window.innerWidth - e.clientX));
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

  const handleStatusClick = useCallback((tab: string) => {
    if (tab === 'code') setWorkspaceTab('code');
    if (tab === 'preview') setWorkspaceTab('preview');
    if (tab === 'research') setWorkspaceTab('research');
    if (tab === 'swarm') setWorkspaceTab('swarm');
    if (tab === 'wiki') setWorkspaceTab('wiki');
    if (tab === 'review') setWorkspaceTab('review');
  }, []);

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
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      setDeployInfo(data);
      setShowDeployModal(true);
    } catch (err) {
      console.error('Deploy failed:', err);
      setDeployInfo({ success: false, error: 'Network error. Check console.' });
      setShowDeployModal(true);
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

  const tabs = [
    { id: 'preview' as WorkspaceTab, label: 'Preview', icon: Eye },
    { id: 'code' as WorkspaceTab, label: 'Code', icon: Code2 },
    { id: 'research' as WorkspaceTab, label: 'Research', icon: Search },
    { id: 'wiki' as WorkspaceTab, label: 'Wiki Pages', icon: BookOpen },
    { id: 'review' as WorkspaceTab, label: 'Code Review', icon: Shield },
    { id: 'swarm' as WorkspaceTab, label: 'Future Release', icon: Bot },
  ];

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-gray-900 truncate max-w-[300px] md:max-w-[500px]" title={project.description || project.name}>
              {project.name}
            </h1>
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
          <button 
            onClick={handleDeploy}
            disabled={isDeploying}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90 disabled:opacity-50`}
          >
            <Play className="w-3 h-3" />
            {isDeploying ? 'Deploying...' : 'Deploy'}
          </button>
        </div>
      </header>

      {/* Deploy Status Modal */}
      {showDeployModal && deployInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              {deployInfo.success ? (
                <>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Play className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Deployment Package Ready</h3>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Deploy Failed</h3>
                </>
              )}
            </div>
            
            {deployInfo.success ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">Package URL</div>
                  <a 
                    href={deployInfo.downloadUrl} 
                    className="text-sm text-blue-600 hover:text-blue-700 break-all font-mono"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {deployInfo.downloadUrl}
                  </a>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong>Deployment ID:</strong> {deployInfo.deploymentId}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Providers supported:</strong> {deployInfo.providers?.join(', ')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {deployInfo.message}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    <strong>Quick deploy to Vercel:</strong><br/>
                    1. Download the ZIP<br/>
                    2. Install Vercel CLI: npm i -g vercel<br/>
                    3. Run: vercel
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeployModal(false)}
                    className="flex-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <a
                    href={deployInfo.downloadUrl}
                    className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download Package
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {deployInfo.error}
                </p>
                <button
                  onClick={() => setShowDeployModal(false)}
                  className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Main 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* PANEL 1: AI Chat (Left) */}
        <div style={{ width: leftPanelWidth }} className="flex-shrink-0 flex flex-col">
          <AIChatPanel
            projectId={project.id}
            type={project.type}
            initialMessages={chatHistory}
            onStatusClick={handleStatusClick}
            projectStatus={project.status}
            files={files}
            tasks={tasks}
          />
        </div>

        {/* Resize Handle - Left */}
        <div
          className="w-1 cursor-col-resize hover:bg-cyan-500/50 active:bg-cyan-500 transition-colors z-10"
          onMouseDown={() => setIsResizingLeft(true)}
          title="Drag to resize"
        />

        {/* PANEL 2: Workspace (Middle) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Workspace Tabs - Horizontal at top */}
          <div className="h-10 border-b border-gray-200 bg-gray-50 flex items-center px-2 gap-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setWorkspaceTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    workspaceTab === tab.id
                      ? 'text-cyan-700 bg-cyan-50 border border-cyan-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Workspace Content */}
          <div className="flex-1 overflow-hidden">
            {workspaceTab === 'preview' && (
              project.type === 'mobile' ? (
                <MobilePreview projectId={project.id} />
              ) : (
                <LivePreview project={project} files={files} activeFile={activeFile} />
              )
            )}

            {workspaceTab === 'code' && (
              <div className="h-full flex flex-col bg-white">
                {activeFile ? (
                  <>
                    <div className="h-9 flex items-center px-4 border-b border-gray-200 text-sm text-gray-400">
                      <FileCode className="w-4 h-4 mr-2" />
                      {activeFile.path}
                      <span className="ml-2 text-gray-400">{activeFile.language}</span>
                    </div>
                    <pre className="flex-1 p-4 overflow-auto text-sm font-mono text-gray-700">
                      <code>{activeFile.content}</code>
                    </pre>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Folder className="w-12 h-12 mx-auto mb-3" />
                      <p className="text-sm">Select a file from the right panel to view code</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {workspaceTab === 'research' && (
              <ResearchPanel projectId={project.id} />
            )}

            {workspaceTab === 'swarm' && (
              <SwarmDashboard projectId={project.id} projectDescription={project.description} projectType={project.type} />
            )}

            {workspaceTab === 'wiki' && (
              <WikiViewer projectId={project.id} />
            )}

            {workspaceTab === 'review' && (
              <CodeReviewPanel projectId={project.id} />
            )}
          </div>
        </div>

        {/* Resize Handle - Right */}
        <div
          className="w-1 cursor-col-resize hover:bg-cyan-500/50 active:bg-cyan-500 transition-colors z-10"
          onMouseDown={() => setIsResizingRight(true)}
          title="Drag to resize"
        />

        {/* PANEL 3: Files (Right) */}
        <div style={{ width: rightPanelWidth }} className="flex-shrink-0 border-l border-gray-200 bg-gray-50/50 flex flex-col">
          <div className="p-3 text-sm font-medium text-gray-400 uppercase">Files</div>
          <div className="flex-1 overflow-auto">
            {files.length === 0 ? (
              <div className="p-4 text-sm text-gray-400 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Generating code...
              </div>
            ) : (
              <div className="space-y-0.5">
                {files
                  .filter((file: any) => !file.path?.includes('research.md'))
                  .map((file: any) => (
                  <button
                    key={file.id}
                    onClick={() => {
                      setActiveFile(file);
                      setWorkspaceTab('code');
                    }}
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
        </div>
      </div>
    </div>
  );
}
