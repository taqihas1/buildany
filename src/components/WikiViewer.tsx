'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, FileText, Code, Wrench, Lightbulb, ChevronDown, ChevronUp, Clock, Sparkles, Edit3, Save, X } from 'lucide-react';

interface WikiViewerProps {
  projectId: string;
}

const pageTypeIcons: Record<string, any> = {
  overview: BookOpen,
  architecture: Code,
  api: Code,
  component: FileText,
  setup: Wrench,
  guide: Lightbulb,
  default: FileText,
};

const pageTypeLabels: Record<string, string> = {
  overview: 'Project Overview',
  architecture: 'Architecture',
  api: 'API Documentation',
  component: 'Components',
  setup: 'Setup Guide',
  guide: 'User Guide',
};

export function WikiViewer({ projectId }: WikiViewerProps) {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // Define fetchWiki BEFORE useEffect calls it
  const fetchWiki = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/project/${projectId}/wiki`);
      const data = await res.json();
      if (data.success && data.pages && data.pages.length > 0) {
        setPages(data.pages || []);
      } else if (data.pages && data.pages.length > 0) {
        // Some APIs return pages without success flag
        setPages(data.pages || []);
      } else {
        console.log('Wiki API returned no pages:', data);
        setPages([]);
      }
    } catch (err) {
      console.error('Wiki fetch error:', err);
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchWiki();
  }, [fetchWiki]);

  const savePage = async (pageId: string) => {
    try {
      const page = pages.find(p => p.id === pageId);
      if (!page) return;

      const res = await fetch(`/api/project/${projectId}/wiki`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: page.pageType,
          title: editTitle || page.title,
          content: editContent || page.content,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingPage(null);
        fetchWiki();
      }
    } catch (err) {
      console.error('Wiki save error:', err);
    }
  };

  const startEdit = (page: any) => {
    setEditingPage(page.id);
    setEditTitle(page.title);
    setEditContent(page.content);
  };

  // Clean up wiki content - remove LLM references
  const cleanContent = (content: string): string => {
    return content
      .replace(/using LLM \(deepseek\/deepseek-chat\)/g, '')
      .replace(/using LLM \([^)]+\)/g, '')
      .replace(/\n\n+/g, '\n\n')
      .trim();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <BookOpen className="w-8 h-8 text-cyan-600 animate-pulse mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading wiki...</p>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center max-w-md p-6">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Wiki Pages Yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Wiki pages are auto-generated during the build process. They document your project's architecture, components, and setup.
          </p>
          <p className="text-sm text-gray-500">
            Generate code first — wiki pages will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-600" />
          <span className="text-base font-medium text-gray-900">Project Wiki</span>
          <span className="text-sm bg-cyan-50 text-cyan-600 px-2 py-0.5 rounded-full">
            {pages.length} pages
          </span>
        </div>
      </div>

      {/* Wiki Pages List */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {pages.map((page) => {
          const Icon = pageTypeIcons[page.pageType] || pageTypeIcons.default;
          const isExpanded = expandedPage === page.id;
          const isEditing = editingPage === page.id;

          return (
            <div
              key={page.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Page Header */}
              <button
                onClick={() => {
                  if (!isEditing) {
                    setExpandedPage(isExpanded ? null : page.id);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <Icon className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {pageTypeLabels[page.pageType] || page.title}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">{page.pageType}</span>
                    {page.autoGenerated && (
                      <span className="flex items-center gap-1 text-cyan-600">
                        <Sparkles className="w-3 h-3" />
                        Auto-generated
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(page.lastUpdatedAt || page.createdAt).toLocaleDateString()}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Page Content */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  {isEditing ? (
                    <div className="p-4 space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-cyan-500"
                        placeholder="Page title"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-64 px-3 py-2 text-sm font-mono border border-gray-200 rounded focus:outline-none focus:border-cyan-500 resize-none"
                        placeholder="Page content..."
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingPage(null)}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        >
                          <X className="w-4 h-4" /> Cancel
                        </button>
                        <button
                          onClick={() => savePage(page.id)}
                          className="px-3 py-1.5 text-sm bg-cyan-50 text-cyan-600 rounded border border-cyan-200 hover:bg-cyan-100 flex items-center gap-1"
                        >
                          <Save className="w-4 h-4" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-medium text-gray-900">{page.title}</h3>
                        <button
                          onClick={() => startEdit(page)}
                          className="text-sm text-gray-500 hover:text-cyan-600 flex items-center gap-1"
                        >
                          <Edit3 className="w-4 h-4" /> Edit
                        </button>
                      </div>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {cleanContent(page.content)}
                        </ReactMarkdown>
                      </div>
                      {page.isTruncated && (
                        <p className="text-sm text-gray-500 mt-2 text-center">
                          Content truncated. Full content available in database.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
