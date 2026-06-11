'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Rocket, Zap, Globe, Smartphone, Check, ChevronRight, Clock, Shield, Server, DollarSign } from 'lucide-react';

interface DeploymentRecommendation {
  provider: string;
  providerDisplay: string;
  reason: string;
  valueProposition: string[];
  freeTier: string;
  estimatedTime: string;
  customDomain: boolean;
  ssl: boolean;
  serverless: boolean;
  bestFor: string[];
}

interface DeployValuePropositionProps {
  projectId: string;
  projectName: string;
  projectType: string;
  onDeploy: (provider: string) => void;
  onCancel: () => void;
}

export function DeployValueProposition({ projectId, projectName, projectType, onDeploy, onCancel }: DeployValuePropositionProps) {
  const [recommendation, setRecommendation] = useState<DeploymentRecommendation | null>(null);
  const [alternatives, setAlternatives] = useState<DeploymentRecommendation[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Define fetchRecommendation BEFORE useEffect calls it
  const fetchRecommendation = useCallback(async () => {
    try {
      const res = await fetch(`/api/deploy/recommend?projectId=${projectId}`);
      const data = await res.json();
      if (data.success) {
        setRecommendation(data.recommendation);
        setAlternatives(data.alternatives);
        setSelectedProvider(data.recommendation.provider);
      }
    } catch (err) {
      console.error('Failed to fetch recommendation:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRecommendation();
  }, [fetchRecommendation]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
            <span className="text-gray-600">Analyzing your project...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendation) return null;

  const getProviderIcon = (provider: string) => {
    if (provider.includes('expo')) return <Smartphone className="w-6 h-6 text-blue-500" />;
    if (provider.includes('cloudflare') || provider.includes('github')) return <Globe className="w-6 h-6 text-orange-500" />;
    return <Server className="w-6 h-6 text-purple-500" />;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 shadow-2xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Rocket className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Deploy "{projectName}"</h2>
                <p className="text-sm text-gray-500">Our orchestrator analyzed your project and recommends the optimal platform</p>
              </div>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Recommended Platform */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-bold text-blue-700 uppercase tracking-wide">Recommended Platform</span>
            </div>
            
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                {getProviderIcon(recommendation.provider)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">{recommendation.providerDisplay}</h3>
                <p className="text-sm text-gray-600 mt-1">{recommendation.reason}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">FREE</div>
                <div className="text-xs text-gray-500">{recommendation.freeTier}</div>
              </div>
            </div>

            {/* Value Propositions */}
            <div className="grid gap-2">
              {recommendation.valueProposition.map((vp, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/60 rounded-lg p-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-700">{vp}</span>
                </div>
              ))}
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Deploy time: {recommendation.estimatedTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                <span>SSL included</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span>Free tier generous</span>
              </div>
            </div>
          </div>

          {/* Best For Tags */}
          <div className="flex flex-wrap gap-2">
            {recommendation.bestFor.map((tag) => (
              <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                {tag}
              </span>
            ))}
          </div>

          {/* Alternative Options */}
          {alternatives.length > 0 && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
                {showDetails ? 'Hide' : 'Show'} alternative platforms ({alternatives.length})
              </button>
              
              {showDetails && (
                <div className="mt-3 space-y-3">
                  {alternatives.map((alt) => (
                    <div
                      key={alt.provider}
                      onClick={() => setSelectedProvider(alt.provider)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedProvider === alt.provider
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getProviderIcon(alt.provider)}
                          <div>
                            <h4 className="font-semibold text-gray-900">{alt.providerDisplay}</h4>
                            <p className="text-sm text-gray-600">{alt.reason}</p>
                          </div>
                        </div>
                        {selectedProvider === alt.provider && (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Free tier: {alt.freeTier} • Deploy time: {alt.estimatedTime}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <span className="font-semibold">Selected:</span> {recommendation.providerDisplay}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onDeploy(selectedProvider)}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              Deploy to {recommendation.providerDisplay}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
