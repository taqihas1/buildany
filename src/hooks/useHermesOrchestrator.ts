"use client";

/**
 * useHermesOrchestrator - React Hook for Chat Panel Integration
 * Now includes manual correction methods!
 */

import { useState, useCallback, useRef } from 'react';
import HermesOrchestrator, { 
  OrchestrationPhase, 
  OrchestrationState,
  PhaseResult,
  PersistentRule
} from '../lib/orchestrator';

export interface OrchestratorStatus {
  message: string;
  phase: OrchestrationPhase;
  progress: number;
  isRunning: boolean;
  isAwaitingUser: boolean;
  userOptions?: string[];
  failedContext?: any;
  phases: PhaseResult[];
  showCorrections?: boolean;
}

export function useHermesOrchestrator() {
  const [status, setStatus] = useState<OrchestratorStatus>({
    message: '',
    phase: 'idle',
    progress: 0,
    isRunning: false,
    isAwaitingUser: false,
    phases: [],
  });

  const orchestratorRef = useRef<HermesOrchestrator | null>(null);

  const startOrchestration = useCallback(async (
    projectId: string,
    prompt: string,
    platform: 'web' | 'mobile' | 'backend'
  ) => {
    const orchestrator = new HermesOrchestrator(
      projectId,
      prompt,
      platform,
      (message: string) => {
        setStatus(prev => ({
          ...prev,
          message,
          phases: [...prev.phases, { 
            phase: prev.phase, 
            success: true, 
            message, 
            timestamp: Date.now() 
          }],
        }));
      },
      (phase: OrchestrationPhase) => {
        setStatus(prev => {
          const flow = ['analyzing', 'coding', 'testing', 'reviewing', 'previewing'];
          const progress = Math.round((flow.indexOf(phase) / flow.length) * 100);
          return {
            ...prev,
            phase,
            progress,
            isRunning: phase !== 'completed' && phase !== 'failed' && phase !== 'awaiting_user',
            isAwaitingUser: phase === 'awaiting_user',
          };
        });
      },
      (context: any) => {
        setStatus(prev => ({
          ...prev,
          isAwaitingUser: true,
          isRunning: false,
          failedContext: context,
          userOptions: context.options || ['Retry', 'Skip', 'Regenerate'],
          message: `⚠️ ${context.failedPhase} failed: ${context.error}`,
        }));
      }
    );

    orchestratorRef.current = orchestrator;
    
    setStatus(prev => ({
      ...prev,
      isRunning: true,
      message: '🚀 Starting...',
      phase: 'analyzing',
    }));

    await orchestrator.start();
  }, []);

  // ===== LEVEL 1: During-run override =====
  const manualOverride = useCallback(async (overrideTo: OrchestrationPhase) => {
    if (!orchestratorRef.current) return;
    const current = orchestratorRef.current.getState().currentPhase;
    await orchestratorRef.current.manualOverride(current, overrideTo);
  }, []);

  // ===== LEVEL 2: Post-run correction =====
  const correctPastDecision = useCallback(async (
    phaseIndex: number,
    whatShouldHaveHappened: 'skip' | 'retry' | 'run_earlier' | 'run_later' | 'different_agent',
    userNotes?: string
  ) => {
    if (!orchestratorRef.current) return;
    await orchestratorRef.current.correctPastDecision(phaseIndex, whatShouldHaveHappened, userNotes);
  }, []);

  // ===== LEVEL 3: Set persistent rule =====
  const setRule = useCallback((rule: Omit<PersistentRule, 'id' | 'createdAt'>) => {
    if (!orchestratorRef.current) return;
    const fullRule: PersistentRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: Date.now(),
    };
    orchestratorRef.current.setPersistentRule(fullRule);
  }, []);

  const userDecision = useCallback(async (decision: 'approve' | 'reject' | 'fix' | 'retry') => {
    if (!orchestratorRef.current) return;
    
    setStatus(prev => ({
      ...prev,
      isAwaitingUser: false,
      isRunning: true,
      message: `⏳ ${decision}...`,
    }));
    
    await orchestratorRef.current.userDecision(decision);
  }, []);

  const reset = useCallback(() => {
    orchestratorRef.current = null;
    setStatus({
      message: '',
      phase: 'idle',
      progress: 0,
      isRunning: false,
      isAwaitingUser: false,
      phases: [],
    });
  }, []);

  // Show correction UI when project is complete or user clicks "Review Decisions"
  const showCorrections = useCallback(() => {
    setStatus(prev => ({ ...prev, showCorrections: true }));
  }, []);

  const hideCorrections = useCallback(() => {
    setStatus(prev => ({ ...prev, showCorrections: false }));
  }, []);

  return {
    status,
    startOrchestration,
    userDecision,
    reset,
    manualOverride,
    correctPastDecision,
    setRule,
    showCorrections,
    hideCorrections,
    currentPhase: status.phase,
    progress: status.progress,
    isRunning: status.isRunning,
    isAwaitingUser: status.isAwaitingUser,
    userOptions: status.userOptions,
    failedContext: status.failedContext,
  };
}

export default useHermesOrchestrator;
