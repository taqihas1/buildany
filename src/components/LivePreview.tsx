'use client';

import { useState, useEffect } from 'react';
import { Eye, Smartphone, Globe, RefreshCw, X, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

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
  }, [files]);

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      // Build a preview from the generated files
      const htmlFiles = files.filter(f => f.path?.endsWith('.html') || f.path?.endsWith('.tsx') || f.path?.endsWith('.jsx'));
      
      if (htmlFiles.length === 0) {
        // Create a simple preview from the first generated file
        const previewHtml = buildPreviewHtml(files, previewType);
        const blob = new Blob([previewHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setIframeUrl(url);
      } else {
        // Use the first HTML file
        const htmlFile = htmlFiles[0];
        const blob = new Blob([htmlFile.content || ''], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setIframeUrl(url);
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const buildPreviewHtml = (files: any[], type: 'web' | 'mobile') => {
    const cssFiles = files.filter(f => f.path?.endsWith('.css') || f.path?.endsWith('.scss'));
    const jsFiles = files.filter(f => f.path?.endsWith('.js') || f.path?.endsWith('.ts') || f.path?.endsWith('.jsx') || f.path?.endsWith('.tsx'));
    const htmlFiles = files.filter(f => f.path?.endsWith('.html'));

    const css = cssFiles.map(f => f.content || '').join('\n');
    const js = jsFiles.map(f => f.content || '').join('\n');

    if (htmlFiles.length > 0) {
      return htmlFiles[0].content || '';
    }

    // Build a wrapper HTML
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
  };

  const copyCode = () => {
    if (activeFile?.content) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clearLogs = () => setConsoleLogs([]);

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Toolbar */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Live Preview</span>
          
          {/* Device Toggle */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 ml-2">
            <button
              onClick={() => setPreviewType('web')}
              className={`flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors ${
                previewType === 'web' ? 'bg-slate-700 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Globe className="w-3 h-3" />
              Web
            </button>
            <button
              onClick={() => setPreviewType('mobile')}
              className={`flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors ${
                previewType === 'mobile' ? 'bg-slate-700 text-purple-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              Mobile
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Building...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowCode(!showCode)}
            className={`text-sm px-2 py-1 rounded transition-colors ${
              showCode ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden relative">
        {iframeUrl ? (
          <div className={`h-full mx-auto transition-all ${
            previewType === 'mobile' ? 'max-w-[375px] border-x border-slate-800' : 'w-full'
          }`}>
            <iframe
              src={iframeUrl}
              className="w-full h-full bg-white"
              sandbox="allow-scripts allow-same-origin"
              title="Preview"
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Eye className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-2">No preview available</p>
              <button
                onClick={handlePreview}
                className="text-sm text-cyan-400 hover:text-cyan-300 underline"
              >
                Generate preview
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Code Overlay */}
      {showCode && activeFile && (
        <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col">
          <div className="h-10 flex items-center justify-between px-3 border-b border-slate-800">
            <span className="text-sm text-white">{activeFile.path}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={copyCode}
                className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => setShowCode(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-slate-300">
            <code>{activeFile.content}</code>
          </pre>
        </div>
      )}

      {/* Console */}
      {consoleLogs.length > 0 && (
        <div className="h-32 border-t border-slate-800 bg-slate-900/50">
          <div className="h-6 flex items-center justify-between px-2 border-b border-slate-800">
            <span className="text-sm text-slate-500">Console</span>
            <button onClick={clearLogs} className="text-sm text-slate-600 hover:text-slate-400">Clear</button>
          </div>
          <div className="overflow-auto p-2 space-y-1">
            {consoleLogs.map((log, i) => (
              <div key={i} className="text-sm font-mono text-slate-400">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
