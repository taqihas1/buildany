'use client';

import { useState, useEffect } from 'react';
import { Search, Target, Zap, Users, Layout, Code, Star, ExternalLink, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface ResearchPanelProps {
  projectId: string;
}

export function ResearchPanel({ projectId }: ResearchPanelProps) {
  const [research, setResearch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCompetitor, setExpandedCompetitor] = useState<number | null>(null);

  useEffect(() => {
    fetchResearch();
  }, [projectId]);

  const fetchResearch = async () => {
    try {
      const res = await fetch(`/api/project/${projectId}/research`);
      const data = await res.json();
      if (data.hasResearch) {
        setResearch(data.research);
      }
    } catch (err) {
      console.error('Failed to fetch research:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <Search className="w-5 h-5 text-cyan-400 animate-pulse mx-auto mb-2" />
        <p className="text-xs text-slate-500">Loading research...</p>
      </div>
    );
  }

  if (!research) {
    return (
      <div className="p-4 text-center">
        <Search className="w-5 h-5 text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-500">No research data available</p>
        <p className="text-xs text-slate-600 mt-1">Research runs automatically when creating a project</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-2 text-cyan-400">
        <Search className="w-4 h-4" />
        <span className="text-sm font-medium">Market Research</span>
        <span className="text-xs text-slate-500 ml-auto">{research.category || 'General'}</span>
      </div>

      {/* Competitors */}
      {research.competitors?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wide">
            <Target className="w-3 h-3" />
            Competitors ({research.competitors.length})
          </div>
          <div className="space-y-1.5">
            {research.competitors.map((comp: any, i: number) => (
              <div key={i} className="bg-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedCompetitor(expandedCompetitor === i ? null : i)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700/50 transition-colors"
                >
                  <div className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center text-xs font-bold text-slate-400">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{comp.name}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-yellow-400" />
                        {comp.rating || 'N/A'}
                      </span>
                      <span>{comp.pricing || 'Unknown'}</span>
                    </div>
                  </div>
                  {expandedCompetitor === i ? (
                    <ChevronUp className="w-3 h-3 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  )}
                </button>
                {expandedCompetitor === i && (
                  <div className="px-3 pb-2 space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {comp.keyFeatures?.map((f: string, j: number) => (
                        <span key={j} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                          {f}
                        </span>
                      ))}
                    </div>
                    {comp.url && (
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Visit
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Features */}
      {research.keyFeatures?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wide">
            <Layout className="w-3 h-3" />
            Must-Have Features
          </div>
          <div className="flex flex-wrap gap-1.5">
            {research.keyFeatures.map((feature: string, i: number) => (
              <span key={i} className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded">
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* UX Patterns */}
      {research.uxPatterns?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wide">
            <Layout className="w-3 h-3" />
            UX Patterns
          </div>
          <div className="space-y-1">
            {research.uxPatterns.map((pattern: string, i: number) => (
              <div key={i} className="text-xs text-slate-300 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                {pattern}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Gaps */}
      {research.gaps?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wide">
            <Zap className="w-3 h-3 text-yellow-400" />
            Market Gaps (Opportunities)
          </div>
          <div className="space-y-1">
            {research.gaps.map((gap: string, i: number) => (
              <div key={i} className="text-xs text-yellow-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                {gap}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pain Points to Avoid */}
      {research.userComplaints?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wide">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Avoid These Pain Points
          </div>
          <div className="space-y-1">
            {research.userComplaints.map((complaint: string, i: number) => (
              <div key={i} className="text-xs text-red-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                {complaint}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Audience */}
      {research.targetAudience && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wide">
            <Users className="w-3 h-3" />
            Target Audience
          </div>
          <p className="text-xs text-slate-300">{research.targetAudience}</p>
        </div>
      )}

      {/* Tech Stack & Monetization */}
      <div className="grid grid-cols-2 gap-2">
        {research.techStack && (
          <div className="bg-slate-800 rounded-lg p-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Code className="w-3 h-3" />
              Common Stack
            </div>
            <p className="text-xs text-slate-300">{research.techStack}</p>
          </div>
        )}
        {research.monetization && (
          <div className="bg-slate-800 rounded-lg p-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Zap className="w-3 h-3 text-green-400" />
              Monetization
            </div>
            <p className="text-xs text-slate-300">{research.monetization}</p>
          </div>
        )}
      </div>

      {/* Design Trends */}
      {research.designTrends?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wide">
            <Layout className="w-3 h-3" />
            Design Trends
          </div>
          <div className="flex flex-wrap gap-1">
            {research.designTrends.map((trend: string, i: number) => (
              <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                {trend}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
