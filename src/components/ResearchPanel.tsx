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
      <div className="p-4 text-center bg-white h-full">
        <Search className="w-5 h-5 text-cyan-600 animate-pulse mx-auto mb-2" />
        <p className="text-xs text-gray-500">Loading research...</p>
      </div>
    );
  }

  if (!research) {
    return (
      <div className="p-4 text-center bg-white h-full">
        <Search className="w-5 h-5 text-gray-600 mx-auto mb-2" />
        <p className="text-xs text-gray-500">No research data available</p>
        <p className="text-xs text-gray-600 mt-1">Research runs automatically when creating a project</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4 overflow-auto bg-white h-full">
      {/* Header */}
      <div className="flex items-center gap-2 text-cyan-600">
        <Search className="w-4 h-4" />
        <span className="text-sm font-medium text-gray-900">Market Research</span>
        <span className="text-xs text-gray-500 ml-auto">{research.category || 'General'}</span>
      </div>

      {/* Competitors */}
      {research.competitors?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide font-medium">
            <Target className="w-3 h-3" />
            Competitors ({research.competitors.length})
          </div>
          <div className="space-y-1.5">
            {research.competitors.map((comp: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                <button
                  onClick={() => setExpandedCompetitor(expandedCompetitor === i ? null : i)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 transition-colors"
                >
                  <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-600">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate font-medium">{comp.name}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400" />
                        {comp.rating || 'N/A'}
                      </span>
                      <span>{comp.pricing || 'Unknown'}</span>
                    </div>
                  </div>
                  {expandedCompetitor === i ? (
                    <ChevronUp className="w-3 h-3 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                  )}
                </button>
                {expandedCompetitor === i && (
                  <div className="px-3 pb-2 space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {comp.keyFeatures?.map((f: string, j: number) => (
                        <span key={j} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {f}
                        </span>
                      ))}
                    </div>
                    {comp.url && (
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700"
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
          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide font-medium">
            <Layout className="w-3 h-3" />
            Must-Have Features
          </div>
          <div className="flex flex-wrap gap-1.5">
            {research.keyFeatures.map((feature: string, i: number) => (
              <span key={i} className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-1 rounded">
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* UX Patterns */}
      {research.uxPatterns?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide font-medium">
            <Layout className="w-3 h-3" />
            UX Patterns
          </div>
          <div className="space-y-1">
            {research.uxPatterns.map((pattern: string, i: number) => (
              <div key={i} className="text-xs text-gray-700 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                {pattern}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Gaps */}
      {research.gaps?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide font-medium">
            <Zap className="w-3 h-3 text-amber-500" />
            Market Gaps (Opportunities)
          </div>
          <div className="space-y-1">
            {research.gaps.map((gap: string, i: number) => (
              <div key={i} className="text-xs text-amber-700 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                {gap}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pain Points to Avoid */}
      {research.userComplaints?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide font-medium">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            Avoid These Pain Points
          </div>
          <div className="space-y-1">
            {research.userComplaints.map((complaint: string, i: number) => (
              <div key={i} className="text-xs text-red-700 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                {complaint}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Audience */}
      {research.targetAudience && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide font-medium">
            <Users className="w-3 h-3" />
            Target Audience
          </div>
          <p className="text-xs text-gray-700">{research.targetAudience}</p>
        </div>
      )}

      {/* Tech Stack & Monetization */}
      <div className="grid grid-cols-2 gap-2">
        {research.techStack && (
          <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Code className="w-3 h-3" />
              Common Stack
            </div>
            <p className="text-xs text-gray-700">{research.techStack}</p>
          </div>
        )}
        {research.monetization && (
          <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Zap className="w-3 h-3 text-green-500" />
              Monetization
            </div>
            <p className="text-xs text-gray-700">{research.monetization}</p>
          </div>
        )}
      </div>

      {/* Design Trends */}
      {research.designTrends?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wide font-medium">
            <Layout className="w-3 h-3" />
            Design Trends
          </div>
          <div className="flex flex-wrap gap-1">
            {research.designTrends.map((trend: string, i: number) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {trend}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}