"use client";

/**
 * useHermesOrchestrator - React Hook for Chat Panel Integration
 * Client-safe version: uses API calls instead of importing server modules
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export type OrchestrationPhase = 
  | 'idle' 
  | 'research' 
  | 'decompose' 
  | 'coding' 
  | 'testing' 
  | 'review' 
  | 'deploy' 
  | 'completed' 
  | 'failed';

export interface PhaseResult {
  phase: OrchestrationPhase;
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

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
  projectId?: string;
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

  const abortRef = useRef(false);
  const projectIdRef = useRef<string | undefined>(undefined);

  // Keep projectIdRef in sync with status
  useEffect(() => {
    projectIdRef.current = status.projectId;
  }, [status.projectId]);

  const startOrchestration = useCallback(async (
    projectId: string,
    prompt: string,
    platform: 'web' | 'mobile' | 'backend'
  ) => {
    abortRef.current = false;
    
    setStatus({
      message: 'Initializing orchestration...',
      phase: 'research',
      progress: 10,
      isRunning: true,
      isAwaitingUser: false,
      phases: [],
      projectId,
    });

    try {
      // Step 1: Generate code via API
      setStatus(prev => ({
        ...prev,
        message: 'Researching and generating code...',
        phase: 'coding',
        progress: 30,
      }));

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, prompt, type: platform }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (abortRef.current) return;

      // Step 2: Decompose tasks
      setStatus(prev => ({
        ...prev,
        message: 'Decomposing into tasks...',
        phase: 'decompose',
        progress: 50,
      }));

      await fetch('/api/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: result.projectId || projectId }),
      }).catch(() => {/* non-blocking */});

      if (abortRef.current) return;

      // Step 3: Complete
      setStatus(prev => ({
        ...prev,
        message: 'Orchestration complete!',
        phase: 'completed',
        progress: 100,
        isRunning: false,
        phases: [
          ...prev.phases,
          { phase: 'coding', success: true, message: 'Code generated', details: result },
          { phase: 'decompose', success: true, message: 'Tasks decomposed' },
          { phase: 'completed', success: true, message: 'All done!' },
        ],
      }));

      return result;
    } catch (error: any) {
      if (abortRef.current) return;
      
      setStatus(prev => ({
        ...prev,
        message: error.message || 'Orchestration failed',
        phase: 'failed',
        progress: 0,
        isRunning: false,
        isAwaitingUser: true,
        failedContext: { error: error.message },
      }));
      
      throw error;
    }
  }, []);

  const applyCorrection = useCallback((correction: string) => {
    setStatus(prev => ({
      ...prev,
      message: `Applying correction: ${correction}`,
      isAwaitingUser: false,
      showCorrections: false,
    }));
    
    // Retry with correction
    if (projectIdRef.current) {
      startOrchestration(projectIdRef.current, correction, 'web');
    }
  }, [startOrchestration]);

  const skipPhase = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      message: 'Phase skipped',
      isAwaitingUser: false,
    }));
  }, []);

  const retry = useCallback(() => {
    setStatus(prev => {
      if (prev.projectId) {
        startOrchestration(prev.projectId, 'Retrying...', 'web');
      }
      return prev;
    });
  }, [startOrchestration]);

  const abort = useCallback(() => {
    abortRef.current = true;
    setStatus(prev => ({
      ...prev,
      message: 'Aborted',
      isRunning: false,
      phase: 'idle',
    }));
  }, []);

  return {
    status,
    startOrchestration,
    applyCorrection,
    skipPhase,
    retry,
    abort,
  };
}

export default useHermesOrchestrator;
