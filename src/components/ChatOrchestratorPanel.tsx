"use client";

/**
 * ChatOrchestratorPanel - React Component for AI Chat Panel
 * 
 * Renders in the chat panel:
 * - Status messages during orchestration
 * - Progress bar
 * - User decision buttons on failure
 */

import React from 'react';
import { Loader2, CheckCircle, AlertTriangle, RotateCcw, SkipForward } from 'lucide-react';
import { useHermesOrchestrator } from '../hooks/useHermesOrchestrator';

interface ChatOrchestratorPanelProps {
  projectId: string;
  prompt: string;
  platform: 'web' | 'mobile' | 'backend';
  onComplete?: () => void;
}

export const ChatOrchestratorPanel: React.FC<ChatOrchestratorPanelProps> = ({
  projectId,
  prompt,
  platform,
  onComplete,
}) => {
  const {
    status,
    startOrchestration,
    applyCorrection,
    skipPhase,
    retry,
    abort,
  } = useHermesOrchestrator();

  const { isRunning, isAwaitingUser, progress, phase, message, phases } = status;

  React.useEffect(() => {
    if (status.phase === 'idle') {
      startOrchestration(projectId, prompt, platform);
    }
  }, [projectId, prompt, platform]);

  React.useEffect(() => {
    if (status.phase === 'completed') {
      onComplete?.();
    }
  }, [status.phase]);

  return (
    <div className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-gray-200">
      {/* Progress Bar */}
      {isRunning && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Status Message */}
      {status.message && (
        <div className="flex items-center gap-2 text-sm">
          {isRunning ? (
            <Loader2 size={16} className="animate-spin text-blue-500" />
          ) : status.phase === 'completed' ? (
            <CheckCircle size={16} className="text-green-500" />
          ) : isAwaitingUser ? (
            <AlertTriangle size={16} className="text-amber-500" />
          ) : null}
          <span className={`
            ${isRunning ? 'text-blue-600' : ''}
            ${status.phase === 'completed' ? 'text-green-600' : ''}
            ${isAwaitingUser ? 'text-amber-600' : ''}
          `}>
            {status.message}
          </span>
        </div>
      )}

      {/* Phase History */}
      {status.phases.length > 0 && (
        <div className="flex flex-col gap-1 text-xs text-gray-500">
          {status.phases.map((phase, index) => (
            <div key={index} className="flex items-center gap-1">
              {phase.success ? (
                <CheckCircle size={10} className="text-green-400" />
              ) : (
                <AlertTriangle size={10} className="text-red-400" />
              )}
              <span>{phase.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* User Decision Buttons */}
      {isAwaitingUser && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="text-sm font-medium text-gray-700">
            What would you like to do?
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => retry()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-blue-500 hover:bg-blue-600 text-white"
            >
              <RotateCcw size={14} />
              Retry
            </button>
            <button
              onClick={() => skipPhase()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-gray-500 hover:bg-gray-600 text-white"
            >
              <SkipForward size={14} />
              Skip
            </button>
            <button
              onClick={() => abort()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-red-500 hover:bg-red-600 text-white"
            >
              <AlertTriangle size={14} />
              Abort
            </button>
          </div>
          {status.failedContext && (
            <div className="text-xs text-gray-400 mt-1">
              Error: {status.failedContext.error || 'Unknown error'}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons (only when completed or failed) */}
      {(status.phase === 'completed' || status.phase === 'failed') && (
        <div className="flex gap-2">
          <button
            onClick={() => retry()}
            className="text-xs text-blue-500 hover:text-blue-600 underline self-start"
          >
            Retry
          </button>
          <button
            onClick={() => abort()}
            className="text-xs text-gray-400 hover:text-gray-600 underline self-start"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatOrchestratorPanel;
