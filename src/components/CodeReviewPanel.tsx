'use client';

import { useState, useEffect, useCallback } from 'react';

interface Review {
  id: string;
  status: string;
  summary?: string;
  issues?: string;
  errorMessage?: string;
}

export default function CodeReviewPanel({ projectId }: { projectId: string }) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReview = useCallback(async () => {
    try {
      const res = await fetch('/api/project/' + projectId + '/review');
      const data = await res.json();
      setReview(data.review);
    } catch (e) {
      console.error('Failed to fetch review:', e);
    }
  }, [projectId]);

  const runReview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/project/' + projectId + '/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      const data = await res.json();
      if (data.success) {
        setReview({ id: data.reviewId, status: 'running' });
      } else {
        alert(data.error || 'Failed to start review');
      }
    } catch (e) {
      console.error(e);
      alert('Error: ' + e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (review?.status !== 'running') return;
    const interval = setInterval(fetchReview, 15000);
    return () => clearInterval(interval);
  }, [review?.status, fetchReview]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  // Safely parse JSON with fallback defaults
  let summary = null;
  if (review?.summary) {
    try {
      summary = JSON.parse(review.summary);
    } catch (e) {
      console.error('Failed to parse summary:', e);
    }
  }

  let issues = [];
  if (review?.issues) {
    try {
      issues = JSON.parse(review.issues);
    } catch (e) {
      console.error('Failed to parse issues:', e);
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Code Review</h2>
      
      {review?.status === 'running' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-700">Review is running... checking every 15 seconds</p>
        </div>
      )}

      {review?.status === 'failed' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700">Review failed: {review.errorMessage || 'Unknown error'}</p>
        </div>
      )}

      {review?.status === 'completed' && summary && (
        <div className="mb-4">
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded text-center">
              <div className="text-2xl font-bold text-red-600">{summary.critical || 0}</div>
              <div className="text-xs text-red-600">Critical</div>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded text-center">
              <div className="text-2xl font-bold text-orange-600">{summary.warnings || 0}</div>
              <div className="text-xs text-orange-600">Warnings</div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.suggestions || 0}</div>
              <div className="text-xs text-blue-600">Suggestions</div>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-center">
              <div className="text-2xl font-bold text-gray-600">{summary.totalIssues || 0}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
          </div>
          
          {issues.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Issues Found:</h3>
              {issues.slice(0, 10).map((issue: any, i: number) => (
                <div key={i} className="p-2 bg-gray-50 border rounded text-sm">
                  <span className={'font-semibold ' + (
                    issue.severity === 'critical' ? 'text-red-600' : 
                    issue.severity === 'warning' ? 'text-orange-600' : 'text-blue-600'
                  )}>
                    {issue.severity || issue.priority || 'info'}
                  </span>
                  {' — '}
                  {issue.message || issue.comment || 'No description'}
                  {issue.file && <span className="text-gray-400 ml-2">({issue.file})</span>}
                </div>
              ))}
              {issues.length > 10 && <p className="text-sm text-gray-500">+{issues.length - 10} more issues</p>}
            </div>
          )}
        </div>
      )}

      <button
        onClick={runReview}
        disabled={loading || review?.status === 'running'}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {review?.status === 'running' ? 'Running...' : 
         review?.status === 'completed' ? 'Run Again' : 
         loading ? 'Starting...' : 'Run Code Review'}
      </button>
    </div>
  );
}