/**
 * ChatOrchestratorPanel - React Component for AI Chat Panel
 * 
 * Renders in the chat panel:
 * - Status messages during orchestration
 * - Progress bar
 * - User decision buttons on failure
 */

import React from 'react';
import { Loader2, CheckCircle, AlertTriangle, Play, RotateCcw, SkipForward, Wrench } from 'lucide-react';
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
    userDecision,
    reset,
    isRunning,
    isAwaitingUser,
    progress,
    userOptions,
    failedContext,
  } = useHermesOrchestrator();

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

  const getDecisionButtonIcon = (option: string) => {
    if (option.includes('fix') || option.includes('Fix')) return <Wrench size={14} />;
    if (option.includes('retry') || option.includes('Retry')) return <RotateCcw size={14} />;
    if (option.includes('skip') || option.includes('Skip')) return <SkipForward size={14} />;
    if (option.includes('regenerate') || option.includes('Regenerate')) return <RotateCcw size={14} />;
    return <Play size={14} />;
  };

  const getDecisionButtonStyle = (option: string) => {
    if (option.includes('fix') || option.includes('Fix')) return 'bg-amber-500 hover:bg-amber-600 text-white';
    if (option.includes('retry') || option.includes('Retry')) return 'bg-blue-500 hover:bg-blue-600 text-white';
    if (option.includes('skip') || option.includes('Skip')) return 'bg-gray-500 hover:bg-gray-600 text-white';
    if (option.includes('regenerate') || option.includes('Regenerate')) return 'bg-purple-500 hover:bg-purple-600 text-white';
    return 'bg-green-500 hover:bg-green-600 text-white';
  };

  const mapOptionToDecision = (option: string): 'approve' | 'reject' | 'fix' | 'retry' => {
    if (option.includes('fix') || option.includes('Fix')) return 'fix';
    if (option.includes('retry') || option.includes('Retry')) return 'retry';
    if (option.includes('skip') || option.includes('Skip')) return 'approve';
    if (option.includes('regenerate') || option.includes('Regenerate')) return 'reject';
    return 'retry';
  };

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
      {isAwaitingUser && userOptions && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="text-sm font-medium text-gray-700">
            What would you like to do?
          </div>
          <div className="flex flex-wrap gap-2">
            {userOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => userDecision(mapOptionToDecision(option))}
                className={`
                  flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium
                  transition-colors
                  ${getDecisionButtonStyle(option)}
                `}
              >
                {getDecisionButtonIcon(option)}
                {option}
              </button>
            ))}
          </div>
          {failedContext && (
            <div className="text-xs text-gray-400 mt-1">
              Failed at: {failedContext.failedPhase} — {failedContext.error}
            </div>
          )}
        </div>
      )}

      {/* Reset Button (only when completed or failed) */}
      {(status.phase === 'completed' || status.phase === 'failed') && (
        <button
          onClick={reset}
          className="text-xs text-gray-400 hover:text-gray-600 underline self-start"
        >
          Reset
        </button>
      )}
    </div>
  );
};

export default ChatOrchestratorPanel;
