"use client";

import { useState } from "react";
import { Shield, Loader2, AlertTriangle, CheckCircle, Zap, ArrowRight, Wrench, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface CodeReviewPanelProps {
  projectId: string;
}

interface ReviewIssue {
  severity: "critical" | "warning" | "suggestion" | "praise";
  category: "security" | "performance" | "maintainability" | "over-engineering" | "yagni";
  line?: string;
  message: string;
  fix?: string;
}

interface PonytailOpportunity {
  original: string;
  simplified: string;
  savings: string;
}

interface ReviewResult {
  summary: string;
  score: "A" | "B" | "C" | "D" | "F" | "?";
  issues: ReviewIssue[];
  ponytailOpportunities?: PonytailOpportunity[];
  raw?: string;
}

export function CodeReviewPanel({ projectId }: CodeReviewPanelProps) {
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
  const [expandedPonytail, setExpandedPonytail] = useState<number | null>(null);

  const runReview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, reviewType: "full" }),
      });
      const data = await res.json();
      if (data.success) {
        setReview(data.review);
      } else {
        setReview({
          summary: "Review failed: " + (data.error || "Unknown error"),
          score: "?",
          issues: [],
          raw: JSON.stringify(data, null, 2),
        });
      }
    } catch (error: any) {
      setReview({
        summary: "Network error: " + error.message,
        score: "?",
        issues: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case "A": return "text-green-600 bg-green-50 border-green-200";
      case "B": return "text-blue-600 bg-blue-50 border-blue-200";
      case "C": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "D": return "text-orange-600 bg-orange-50 border-orange-200";
      case "F": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "warning": return <Zap className="w-4 h-4 text-yellow-500" />;
      case "suggestion": return <Sparkles className="w-4 h-4 text-blue-500" />;
      case "praise": return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Wrench className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "security": return "bg-red-50 text-red-600 border-red-200";
      case "performance": return "bg-yellow-50 text-yellow-600 border-yellow-200";
      case "maintainability": return "bg-blue-50 text-blue-600 border-blue-200";
      case "over-engineering": return "bg-purple-50 text-purple-600 border-purple-200";
      case "yagni": return "bg-pink-50 text-pink-600 border-pink-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const criticalCount = review?.issues.filter(i => i.severity === "critical").length || 0;
  const warningCount = review?.issues.filter(i => i.severity === "warning").length || 0;
  const suggestionCount = review?.issues.filter(i => i.severity === "suggestion").length || 0;
  const ponytailCount = review?.ponytailOpportunities?.length || 0;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Kelly Code Review</h2>
          {review && (
            <span className={`px-2 py-0.5 text-sm font-bold rounded-lg border ${getScoreColor(review.score)}`}>
              {review.score}
            </span>
          )}
        </div>
        <button
          onClick={runReview}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {loading ? "Kelly is reviewing..." : "Run Review"}
        </button>
      </div>

      {!review && !loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Shield className="w-12 h-12 mx-auto mb-3" />
            <p className="text-sm">Click "Run Review" to have Kelly analyze your code</p>
            <p className="text-xs mt-1">Powered by code-review-and-quality + ponytail skills</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
            <p className="text-sm text-purple-600 font-medium">Kelly is analyzing your code...</p>
            <p className="text-xs text-gray-400 mt-1">Checking security, performance, YAGNI, and over-engineering</p>
          </div>
        </div>
      )}

      {review && !loading && (
        <div className="flex-1 overflow-auto">
          {/* Summary */}
          <div className="p-4 border-b border-gray-200">
            <p className="text-sm text-gray-700">{review.summary}</p>
            
            {/* Stats */}
            <div className="flex gap-3 mt-3">
              {criticalCount > 0 && (
                <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-50 text-red-600 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> {criticalCount} Critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-50 text-yellow-600 rounded-full">
                  <Zap className="w-3 h-3" /> {warningCount} Warnings
                </span>
              )}
              {suggestionCount > 0 && (
                <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                  <Sparkles className="w-3 h-3" /> {suggestionCount} Suggestions
                </span>
              )}
              {ponytailCount > 0 && (
                <span className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full">
                  <Wrench className="w-3 h-3" /> {ponytailCount} Simplifications
                </span>
              )}
            </div>
          </div>

          {/* Issues List */}
          {review.issues.length > 0 && (
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Issues Found
              </h3>
              <div className="space-y-2">
                {review.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedIssue(expandedIssue === idx ? null : idx)}
                      className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      {getSeverityIcon(issue.severity)}
                      <span className="text-sm flex-1">{issue.message}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getCategoryColor(issue.category)}`}>
                        {issue.category}
                      </span>
                      {issue.line && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {issue.line}
                        </span>
                      )}
                      {expandedIssue === idx ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {expandedIssue === idx && issue.fix && (
                      <div className="px-3 pb-3 bg-gray-50 border-t border-gray-100">
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <ArrowRight className="w-3 h-3" /> Suggested fix:
                        </div>
                        <pre className="mt-1 p-2 text-xs font-mono bg-gray-800 text-gray-100 rounded-lg overflow-x-auto">
                          {issue.fix}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ponytail Opportunities */}
          {review.ponytailOpportunities && review.ponytailOpportunities.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Ponytail Simplifications
              </h3>
              <div className="space-y-2">
                {review.ponytailOpportunities.map((opp, idx) => (
                  <div
                    key={idx}
                    className="border border-purple-200 rounded-lg overflow-hidden bg-purple-50/50"
                  >
                    <button
                      onClick={() => setExpandedPonytail(expandedPonytail === idx ? null : idx)}
                      className="w-full flex items-center gap-2 p-3 text-left hover:bg-purple-50 transition-colors"
                    >
                      <Wrench className="w-4 h-4 text-purple-500" />
                      <span className="text-sm flex-1">
                        Simplify — saves {opp.savings}
                      </span>
                      {expandedPonytail === idx ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {expandedPonytail === idx && (
                      <div className="px-3 pb-3 border-t border-purple-100">
                        <div className="mt-2">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Current</div>
                          <pre className="p-2 text-xs font-mono bg-gray-800 text-gray-100 rounded-lg overflow-x-auto">
                            {opp.original}
                          </pre>
                        </div>
                        <div className="mt-2">
                          <div className="text-[10px] text-green-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" /> Simplified
                          </div>
                          <pre className="p-2 text-xs font-mono bg-gray-800 text-green-300 rounded-lg overflow-x-auto">
                            {opp.simplified}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
