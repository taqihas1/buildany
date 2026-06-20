'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, Smartphone, Globe, RefreshCw, X, ChevronDown, ChevronUp, Copy, Check, AlertTriangle, QrCode, Link, ExternalLink, Loader2 } from 'lucide-react';

interface LivePreviewProps {
  project: any;
  files: any[];
  activeFile: any;
}

export function LivePreview({ project, files, activeFile }: LivePreviewProps) {
  const [previewType, setPreviewType] = useState<'web' | 'mobile'>('web');
  const [iframeUrl, setIframeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [isNextJs, setIsNextJs] = useState(false);
  const [fileList, setFileList] = useState(files);
  
  // RN Preview state
  const [rnPreviewUrl, setRnPreviewUrl] = useState('');
  const [rnPreviewId, setRnPreviewId] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  
  // Use ref for interval to avoid setState in cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Define buildPreviewHtml BEFORE useEffect calls it
  const buildPreviewHtml = useCallback((files: any[], type: 'web' | 'mobile') => {
    const cssFiles = files.filter(f => f.path?.endsWith('.css') || f.path?.endsWith('.scss'));
    const jsFiles = files.filter(f => f.path?.endsWith('.js') || f.path?.endsWith('.ts') || f.path?.endsWith('.jsx') || f.path?.endsWith('.tsx'));
    const htmlFiles = files.filter(f => f.path?.endsWith('.html'));

    const css = cssFiles.map(f => f.content || '').join('\n');
    const js = jsFiles.map(f => f.content || '').join('\n');

    if (htmlFiles.length > 0) {
      return (htmlFiles.find(f => f.path === '__preview.html') || htmlFiles[0]).content || '';
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${css}
body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: #f5f5f5; }
</style>
</head>
<body>
<div id="root"></div>
<script>
${js}
</script>
</body>
</html>`;
  }, []);

  // Define handlePreviewWithFiles BEFORE useEffect calls it
  const handlePreviewWithFiles = useCallback(async (filesToUse: any[]) => {
    setIsLoading(true);
    try {
      const hasNextJsFiles = filesToUse.some(f => 
        f.path?.includes('layout.tsx') || 
        f.path?.includes('page.tsx') ||
        f.path?.includes('next.config')
      );
      
      if (hasNextJsFiles) {
        setIsNextJs(true);
        setIsLoading(false);
        return;
      }
      
      setIsNextJs(false);
      
      const htmlFiles = filesToUse.filter(f => f.path?.endsWith('.html') || f.path?.endsWith('.tsx') || f.path?.endsWith('.jsx'));
      
      if (htmlFiles.length === 0) {
        const previewHtml = buildPreviewHtml(filesToUse, previewType);
        const blob = new Blob([previewHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setIframeUrl(url);
      } else {
        const htmlFile = htmlFiles.find(f => f.path === '__preview.html') || htmlFiles[0];
        const blob = new Blob([htmlFile.content || ''], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setIframeUrl(url);
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [previewType, buildPreviewHtml]);

  // Define handlePreview BEFORE useEffect calls it
  const handlePreview = useCallback(async () => {
    handlePreviewWithFiles(fileList);
  }, [fileList, handlePreviewWithFiles]);

  // Publish to RN Preview
  const publishToRnPreview = useCallback(async () => {
    if (!project?.id || fileList.length === 0) return;
    
    setIsPublishing(true);
    setPublishError('');
    
    try {
      const response = await fetch('/api/publish-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          files: fileList.map(f => ({ path: f.path, content: f.content })),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRnPreviewUrl(data.url);
        setRnPreviewId(data.id);
      } else {
        setPublishError(data.error || 'Failed to publish preview');
      }
    } catch (err: any) {
      setPublishError(err.message || 'Network error');
    } finally {
      setIsPublishing(false);
    }
  }, [project, fileList]);

  // Define copyCode and clearLogs
  const copyCode = useCallback(() => {
    if (activeFile?.content) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [activeFile]);

  const clearLogs = useCallback(() => setConsoleLogs([]), []);

  // Set preview type based on project type
  useEffect(() => {
    if (project?.type === 'mobile') {
      setPreviewType('mobile');
    }
  }, [project]);

  // Auto-generate preview when files are available
  useEffect(() => {
    if (files.length > 0 && !iframeUrl) {
      handlePreview();
    }
  }, [files, iframeUrl, handlePreview]);

  // Sync fileList with files prop
  useEffect(() => {
    setFileList(files);
  }, [files]);

  // Poll for new files when project is generating
  useEffect(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (project?.status === 'generating') {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/project/${project.id}/files`);
          if (res.ok) {
            const data = await res.json();
            if (data.files && data.files.length !== fileList.length) {
              setFileList(data.files);
              // Auto-regenerate preview if __preview.html was added
              const hasPreview = data.files.some((f: any) => f.path === '__preview.html');
              if (hasPreview && !iframeUrl) {
                handlePreviewWithFiles(data.files);
              }
            }
          }
        } catch (err) {
          console.error('File poll error:', err);
        }
      }, 3000);
      refreshIntervalRef.current = interval;
      return () => {
        clearInterval(interval);
        refreshIntervalRef.current = null;
      };
    }
  }, [project?.status, project?.id, fileList.length, iframeUrl, handlePreviewWithFiles]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-medium text-gray-900">Live Preview</span>
          
          {/* Device Toggle */}
          <div className="flex bg-white rounded-lg p-0.5 ml-2 border border-gray-200">
            <button
              onClick={() => setPreviewType('web')}
              className={`flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors ${
                previewType === 'web' ? 'bg-gray-100 text-cyan-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Globe className="w-3 h-3" />
              Web
            </button>
            <button
              onClick={() => setPreviewType('mobile')}
              className={`flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors ${
                previewType === 'mobile' ? 'bg-gray-100 text-purple-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              Mobile
            </button>
          </div>
          
          {/* RN Preview Publish Button (Mobile only) */}
          {previewType === 'mobile' && (
            <button
              onClick={publishToRnPreview}
              disabled={isPublishing || fileList.length === 0}
              className={`flex items-center gap-1 px-2 py-1 text-sm rounded border transition-colors ml-2 ${
                rnPreviewUrl 
                  ? 'bg-purple-50 text-purple-600 border-purple-200' 
                  : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'
              } disabled:opacity-50`}
            >
              {isPublishing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : rnPreviewUrl ? (
                <QrCode className="w-3 h-3" />
              ) : (
                <ExternalLink className="w-3 h-3" />
              )}
              {isPublishing ? 'Publishing...' : rnPreviewUrl ? 'Preview Published' : 'Publish Preview'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-cyan-50 text-cyan-600 rounded border border-cyan-200 hover:bg-cyan-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Building...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowCode(!showCode)}
            className={`text-sm px-2 py-1 rounded transition-colors border ${
              showCode ? 'bg-cyan-50 text-cyan-600 border-cyan-200' : 'text-gray-500 border-gray-200 hover:text-gray-700'
            }`}
          >
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
        </div>
      </div>

      {/* RN Preview QR Code Panel */}
      {rnPreviewUrl && previewType === 'mobile' && (
        <div className="bg-purple-50 border-b border-purple-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Live Mobile Preview</span>
            </div>
            <button
              onClick={() => {
                setRnPreviewUrl('');
                setRnPreviewId('');
              }}
              className="text-xs text-purple-600 hover:text-purple-800"
            >
              Dismiss
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2">
            {/* QR Code Image */}
            <div className="bg-white p-2 rounded border border-purple-200">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(rnPreviewUrl)}`}
                alt="Preview QR Code"
                className="w-24 h-24"
              />
            </div>
            
            <div className="flex-1">
              <p className="text-sm text-purple-800 mb-1">Scan this QR code with your phone to open the app preview.</p>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={rnPreviewUrl} 
                  readOnly 
                  className="flex-1 text-xs bg-white border border-purple-200 rounded px-2 py-1 text-purple-900"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(rnPreviewUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <a
                  href={rnPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open
                </a>
              </div>
              {rnPreviewId && <p className="text-xs text-purple-500 mt-1">Preview ID: {rnPreviewId}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Publish Error */}
      {publishError && previewType === 'mobile' && (
        <div className="bg-red-50 border-b border-red-200 p-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{publishError}</span>
            <button
              onClick={() => setPublishError('')}
              className="ml-auto text-xs text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden relative">
        {isNextJs ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md p-6">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Next.js App Detected</h3>
              <p className="text-sm text-gray-600 mb-4">
                This is a Next.js application that requires a server to run. It cannot be previewed directly in the browser.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  To preview this app:
                </p>
                <ol className="text-sm text-gray-600 text-left space-y-1 list-decimal list-inside">
                  <li>Download the Web ZIP</li>
                  <li>Extract the files</li>
                  <li>Run <code className="bg-gray-100 px-1 py-0.5 rounded">npm install</code></li>
                  <li>Run <code className="bg-gray-100 px-1 py-0.5 rounded">npm run dev</code></li>
                </ol>
              </div>
              <button
                onClick={() => {
                  // Trigger download
                  const event = new CustomEvent('download-web');
                  window.dispatchEvent(event);
                }}
                className="mt-4 px-4 py-2 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700 transition-colors"
              >
                Download Web ZIP
              </button>
            </div>
          </div>
        ) : iframeUrl ? (
          <div className={`h-full mx-auto transition-all ${
            previewType === 'mobile' ? 'max-w-[375px] border-x border-gray-200' : 'w-full'
          }`}>
            <iframe
              src={iframeUrl}
              className="w-full h-full bg-white"
              sandbox="allow-scripts allow-same-origin"
              title="Preview"
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-2">No preview available</p>
              <button
                onClick={handlePreview}
                className="text-sm text-cyan-600 hover:text-cyan-700 underline"
              >
                Generate preview
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Code Overlay */}
      {showCode && activeFile && (
        <div className="absolute inset-0 bg-white/95 z-50 flex flex-col">
          <div className="h-10 flex items-center justify-between px-3 border-b border-gray-200">
            <span className="text-sm text-gray-900">{activeFile.path}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={copyCode}
                className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => setShowCode(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-gray-700">
            <code>{activeFile.content}</code>
          </pre>
        </div>
      )}

      {/* Console */}
      {consoleLogs.length > 0 && (
        <div className="h-32 border-t border-gray-200 bg-gray-50">
          <div className="h-6 flex items-center justify-between px-2 border-b border-gray-200">
            <span className="text-sm text-gray-500">Console</span>
            <button onClick={clearLogs} className="text-sm text-gray-600 hover:text-gray-400">Clear</button>
          </div>
          <div className="overflow-auto p-2 space-y-1">
            {consoleLogs.map((log, i) => (
              <div key={i} className="text-sm font-mono text-gray-600">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
