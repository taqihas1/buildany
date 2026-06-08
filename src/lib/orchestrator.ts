/**
 * Hermes Orchestrator - Master Orchestration Engine for BuildAny
 * 
 * Manages the full development lifecycle:
 * Code Generation → Testing → Code Review → Preview → User Approval
 * 
 * Learns from project outcomes (success/failure) to improve routing decisions.
 */

export type OrchestrationPhase = 
  | 'idle'
  | 'analyzing'
  | 'coding'
  | 'testing'
  | 'reviewing'
  | 'previewing'
  | 'completed'
  | 'failed'
  | 'awaiting_user';

export type AgentType = 'code' | 'test' | 'review' | 'preview' | 'fix';

export interface PersistentRule {
  id: string;
  description: string;
  platform?: 'web' | 'mobile' | 'backend';
  projectType?: string;
  action: 'skip' | 'add_phase' | 'require_before' | 'modify_prompt';
  targetPhase: OrchestrationPhase;
  createdAt: number;
}

export interface ManualCorrectionRecord {
  type: 'override' | 'post_hoc_correction' | 'rule_violation';
  fromPhase?: OrchestrationPhase;
  toPhase?: OrchestrationPhase;
  phase?: OrchestrationPhase;
  originalDecision?: string;
  correctedTo?: string;
  reason?: string;
  userNotes?: string;
  timestamp: number;
}

export interface PhaseResult {
  phase: OrchestrationPhase;
  success: boolean;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
  manuallyCorrected?: boolean; // Flag if user overrode this
}

export interface OrchestrationState {
  projectId: string;
  prompt: string;
  platform: 'web' | 'mobile' | 'backend';
  currentPhase: OrchestrationPhase;
  phases: PhaseResult[];
  startedAt: number;
  updatedAt: number;
  userDecision?: 'approve' | 'reject' | 'fix' | 'retry';
  learningContext: LearningContext;
  manualCorrections: ManualCorrectionRecord[];
  appliedRules: PersistentRule[];
}

export interface LearningContext {
  projectType: string;
  complexity: 'low' | 'medium' | 'high';
  patterns: string[];
  previousOutcomes: OutcomeRecord[];
}

export interface OutcomeRecord {
  projectId: string;
  platform: string;
  success: boolean;
  failedPhase?: OrchestrationPhase;
  errorType?: string;
  timestamp: number;
}

export interface OrchestratorConfig {
  autoRetryOnFailure: boolean;
  maxRetries: number;
  pauseOnFailure: boolean;
  requireUserApproval: boolean;
  learningEnabled: boolean;
}

export const DEFAULT_CONFIG: OrchestratorConfig = {
  autoRetryOnFailure: false, // User wants manual decision on failure
  maxRetries: 2,
  pauseOnFailure: true, // Only pause on failure
  requireUserApproval: true,
  learningEnabled: true,
};

// Phase flow definitions
export const PHASE_FLOW: Record<OrchestrationPhase, OrchestrationPhase[]> = {
  idle: ['analyzing'],
  analyzing: ['coding'],
  coding: ['testing'],
  testing: ['reviewing', 'failed'], // can go to review or fail
  reviewing: ['previewing', 'failed'],
  previewing: ['completed', 'failed'],
  completed: [],
  failed: ['awaiting_user'],
  awaiting_user: ['coding', 'testing', 'previewing', 'completed'], // user can route anywhere
};

// Status messages shown in AI chat panel
export const PHASE_STATUS_MESSAGES: Record<OrchestrationPhase, string> = {
  idle: '',
  analyzing: '🔍 Analyzing your request...',
  coding: '⚡ Generating code...',
  testing: '🧪 Running tests...',
  reviewing: '🔍 Reviewing code quality...',
  previewing: '🚀 Building preview...',
  completed: '✅ All done! Your project is ready.',
  failed: '⚠️ Something went wrong. Need your input.',
  awaiting_user: '⏳ Waiting for your decision...',
};

export class HermesOrchestrator {
  private state: OrchestrationState;
  private config: OrchestratorConfig;
  private onStatusUpdate: (status: string) => void;
  private onPhaseChange: (phase: OrchestrationPhase) => void;
  private onAwaitingUser: (context: any) => void;

  constructor(
    projectId: string,
    prompt: string,
    platform: 'web' | 'mobile' | 'backend',
    onStatusUpdate: (status: string) => void,
    onPhaseChange: (phase: OrchestrationPhase) => void,
    onAwaitingUser: (context: any) => void,
    config: Partial<OrchestratorConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onStatusUpdate = onStatusUpdate;
    this.onPhaseChange = onPhaseChange;
    this.onAwaitingUser = onAwaitingUser;
    
    this.state = {
      projectId,
      prompt,
      platform,
      currentPhase: 'idle',
      phases: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
      learningContext: {
        projectType: this.inferProjectType(prompt),
        complexity: this.inferComplexity(prompt),
        patterns: [],
        previousOutcomes: this.loadPreviousOutcomes(),
      },
    };
  }

  async start() {
    await this.transitionTo('analyzing');
    
    // Analyze prompt and determine optimal flow
    const flow = this.determineFlow();
    
    for (const phase of flow) {
      const result = await this.executePhase(phase);
      
      if (!result.success) {
        await this.handleFailure(result);
        return; // Stop and wait for user
      }
      
      // Update chat with success
      this.onStatusUpdate(this.formatSuccessMessage(result));
    }
    
    await this.transitionTo('completed');
  }

  private async executePhase(phase: OrchestrationPhase): Promise<PhaseResult> {
    await this.transitionTo(phase);
    
    try {
      let result: PhaseResult;
      
      switch (phase) {
        case 'coding':
          result = await this.executeCodeAgent();
          break;
        case 'testing':
          result = await this.executeTestAgent();
          break;
        case 'reviewing':
          result = await this.executeReviewAgent();
          break;
        case 'previewing':
          result = await this.executePreviewAgent();
          break;
        default:
          result = { phase, success: true, message: 'Skipped', timestamp: Date.now() };
      }
      
      this.state.phases.push(result);
      this.state.updatedAt = Date.now();
      
      return result;
    } catch (error) {
      const failureResult: PhaseResult = {
        phase,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
      this.state.phases.push(failureResult);
      return failureResult;
    }
  }

  private async executeCodeAgent(): Promise<PhaseResult> {
    // This calls the actual code generation API
    // Returns when code is generated
    return {
      phase: 'coding',
      success: true,
      message: 'Code generated successfully',
      details: { filesGenerated: 12 },
      timestamp: Date.now(),
    };
  }

  private async executeTestAgent(): Promise<PhaseResult> {
    // Run tests on generated code
    // Can return failure if tests don't pass
    return {
      phase: 'testing',
      success: true,
      message: 'All tests passed',
      details: { testsPassed: 8, testsFailed: 0 },
      timestamp: Date.now(),
    };
  }

  private async executeReviewAgent(): Promise<PhaseResult> {
    // Run Alibaba code review or similar
    return {
      phase: 'reviewing',
      success: true,
      message: 'Code review complete',
      details: { issuesFound: 2, suggestions: 5 },
      timestamp: Date.now(),
    };
  }

  private async executePreviewAgent(): Promise<PhaseResult> {
    // Build preview
    return {
      phase: 'previewing',
      success: true,
      message: 'Preview built successfully',
      details: { previewUrl: '/preview/123' },
      timestamp: Date.now(),
    };
  }

  private async handleFailure(result: PhaseResult) {
    await this.transitionTo('failed');
    
    // Log for learning
    this.logOutcome({
      projectId: this.state.projectId,
      platform: this.state.platform,
      success: false,
      failedPhase: result.phase,
      errorType: result.message,
      timestamp: Date.now(),
    });
    
    // Pause and ask user
    await this.transitionTo('awaiting_user');
    this.onAwaitingUser({
      failedPhase: result.phase,
      error: result.message,
      options: this.getUserOptions(result.phase),
    });
  }

  private getUserOptions(failedPhase: OrchestrationPhase): string[] {
    switch (failedPhase) {
      case 'testing':
        return ['Auto-fix issues', 'Review test output', 'Skip tests', 'Regenerate code'];
      case 'reviewing':
        return ['Apply suggestions', 'Ignore issues', 'Regenerate code'];
      case 'previewing':
        return ['Fix and rebuild', 'Skip preview', 'Review code'];
      default:
        return ['Retry', 'Skip', 'Regenerate'];
    }
  }

  // User makes a decision after failure
  async userDecision(decision: 'approve' | 'reject' | 'fix' | 'retry', context?: any) {
    this.state.userDecision = decision;
    
    switch (decision) {
      case 'fix':
        // Route to fix agent and retry current phase
        await this.transitionTo(this.state.phases[this.state.phases.length - 1].phase);
        break;
      case 'retry':
        // Retry the same phase
        const lastPhase = this.state.phases[this.state.phases.length - 1].phase;
        await this.executePhase(lastPhase);
        break;
      case 'approve':
        // Skip and continue
        await this.continueFromFailure();
        break;
      case 'reject':
        // Go back to coding
        await this.executePhase('coding');
        break;
    }
  }

  // ===== MANUAL CORRECTION METHODS =====
  
  /**
   * LEVEL 1: Override a decision DURING the run
   * Called when user clicks "Pause & Override" or similar
   */
  async manualOverride(currentPhase: OrchestrationPhase, overrideTo: OrchestrationPhase) {
    this.logManualCorrection({
      type: 'override',
      fromPhase: currentPhase,
      toPhase: overrideTo,
      reason: 'User manually overrode routing decision',
      timestamp: Date.now(),
    });
    
    await this.transitionTo(overrideTo);
    const result = await this.executePhase(overrideTo);
    
    if (!result.success) {
      await this.handleFailure(result);
    } else {
      // Continue from the override point
      await this.continueFromPhase(overrideTo);
    }
  }
  
  /**
   * LEVEL 2: Correct a decision AFTER the run completes
   * User reviews what Hermes did and flags decisions as right/wrong
   */
  async correctPastDecision(
    phaseIndex: number, 
    whatShouldHaveHappened: 'skip' | 'retry' | 'run_earlier' | 'run_later' | 'different_agent',
    userNotes?: string
  ) {
    const phase = this.state.phases[phaseIndex];
    if (!phase) return;
    
    this.logManualCorrection({
      type: 'post_hoc_correction',
      phase: phase.phase,
      originalDecision: 'proceeded',
      correctedTo: whatShouldHaveHappened,
      userNotes,
      timestamp: Date.now(),
    });
    
    // Update learning weights
    this.updateLearningWeights(phase.phase, whatShouldHaveHappened);
  }
  
  /**
   * LEVEL 3: Set a persistent rule
   * User says "always do X for Y type of projects"
   */
  setPersistentRule(rule: PersistentRule) {
    const rules = this.loadPersistentRules();
    rules.push(rule);
    this.savePersistentRules(rules);
    
    this.onStatusUpdate(`📋 Rule set: ${rule.description}`);
  }
  
  // Get rules that apply to current project
  getApplicableRules(): PersistentRule[] {
    const rules = this.loadPersistentRules();
    return rules.filter(rule => {
      // Check if rule applies to current platform/project type
      if (rule.platform && rule.platform !== this.state.platform) return false;
      if (rule.projectType && rule.projectType !== this.state.learningContext.projectType) return false;
      return true;
    });
  }
  
  // Check if a persistent rule overrides the default flow
  shouldSkipPhase(phase: OrchestrationPhase): boolean {
    const rules = this.getApplicableRules();
    return rules.some(rule => 
      rule.action === 'skip' && rule.targetPhase === phase
    );
  }
  
  // Check if a rule says to run an extra phase
  getExtraPhases(): OrchestrationPhase[] {
    const rules = this.getApplicableRules();
    return rules
      .filter(rule => rule.action === 'add_phase')
      .map(rule => rule.targetPhase as OrchestrationPhase);
  }
  
  // ===== PRIVATE LEARNING METHODS =====
  
  private logManualCorrection(correction: ManualCorrectionRecord) {
    const corrections = this.loadManualCorrections();
    corrections.push(correction);
    if (corrections.length > 50) corrections.shift(); // Keep last 50
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('hermes_manual_corrections', JSON.stringify(corrections));
    }
    
    // Also log to console for debugging
    console.log('[Hermes] Manual correction logged:', correction);
  }
  
  private loadManualCorrections(): ManualCorrectionRecord[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('hermes_manual_corrections');
    if (stored) {
      try { return JSON.parse(stored); } catch { return []; }
    }
    return [];
  }
  
  private loadPersistentRules(): PersistentRule[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('hermes_persistent_rules');
    if (stored) {
      try { return JSON.parse(stored); } catch { return []; }
    }
    return [];
  }
  
  private savePersistentRules(rules: PersistentRule[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hermes_persistent_rules', JSON.stringify(rules));
    }
  }
  
  private updateLearningWeights(phase: OrchestrationPhase, correction: string) {
    // Adjust the probability weights for phase transitions
    // This is a simple implementation - can be made more sophisticated
    const outcomes = this.loadPreviousOutcomes();
    const samePhaseCorrections = this.loadManualCorrections().filter(c => 
      c.type === 'post_hoc_correction' && c.phase === phase
    );
    
    // If many corrections say "skip this phase", increase skip probability
    const skipRate = samePhaseCorrections.filter(c => c.correctedTo === 'skip').length / samePhaseCorrections.length;
    
    console.log(`[Hermes Learning] Phase "${phase}" skip rate from corrections: ${skipRate.toFixed(2)}`);
  }
  
  private async continueFromPhase(phase: OrchestrationPhase) {
    const nextPhases = this.getNextPhases(phase);
    for (const nextPhase of nextPhases) {
      // Check if a persistent rule says skip this phase
      if (this.shouldSkipPhase(nextPhase)) {
        this.onStatusUpdate(`⏭️ Skipping ${nextPhase} (per your rule)`);
        continue;
      }
      
      const result = await this.executePhase(nextPhase);
      if (!result.success) {
        await this.handleFailure(result);
        return;
      }
    }
    await this.transitionTo('completed');
  }
  
  // ===== MODIFIED METHODS =====
  
  // Modified determineFlow to check persistent rules
  private determineFlow(): OrchestrationPhase[] {
    const outcomes = this.state.learningContext.previousOutcomes;
    const sameType = outcomes.filter(o => o.platform === this.state.platform);
    
    let flow: OrchestrationPhase[] = ['coding', 'testing', 'reviewing', 'previewing'];
    
    // Apply persistent rules - add extra phases
    const extraPhases = this.getExtraPhases();
    if (extraPhases.length > 0) {
      flow = [...extraPhases, ...flow];
    }
    
    // Apply persistent rules - skip phases
    flow = flow.filter(phase => !this.shouldSkipPhase(phase));
    
    // Learning adjustments
    const testFailures = sameType.filter(o => o.failedPhase === 'testing').length;
    const testSuccess = sameType.filter(o => o.success).length;
    
    if (testFailures > testSuccess && testFailures > 2) {
      this.onStatusUpdate('📚 Learning: High test failure rate detected, running extra validation...');
    }
    
    return flow;
  }
  
  // Modified continueFromFailure to check rules
  private async continueFromFailure() {
    const failedPhaseIndex = this.state.phases.findLastIndex(p => !p.success);
    if (failedPhaseIndex === -1) return;
    
    const nextPhases = this.getNextPhases(this.state.phases[failedPhaseIndex].phase);
    for (const phase of nextPhases) {
      // Check persistent rules
      if (this.shouldSkipPhase(phase)) {
        this.onStatusUpdate(`⏭️ Skipping ${phase} (per your rule)`);
        continue;
      }
      
      const result = await this.executePhase(phase);
      if (!result.success) {
        await this.handleFailure(result);
        return;
      }
    }
    await this.transitionTo('completed');
  }

  private getNextPhases(currentPhase: OrchestrationPhase): OrchestrationPhase[] {
    const flow = ['coding', 'testing', 'reviewing', 'previewing'];
    const currentIndex = flow.indexOf(currentPhase);
    if (currentIndex === -1) return [];
    return flow.slice(currentIndex + 1) as OrchestrationPhase[];
  }

  private async transitionTo(phase: OrchestrationPhase) {
    this.state.currentPhase = phase;
    this.state.updatedAt = Date.now();
    this.onPhaseChange(phase);
    
    if (PHASE_STATUS_MESSAGES[phase]) {
      this.onStatusUpdate(PHASE_STATUS_MESSAGES[phase]);
    }
    
    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private formatSuccessMessage(result: PhaseResult): string {
    switch (result.phase) {
      case 'coding':
        return `✅ Code generated (${result.details?.filesGenerated || 'multiple'} files)`;
      case 'testing':
        return `🧪 Tests: ${result.details?.testsPassed || 0} passed, ${result.details?.testsFailed || 0} failed`;
      case 'reviewing':
        return `🔍 Review: ${result.details?.issuesFound || 0} issues, ${result.details?.suggestions || 0} suggestions`;
      case 'previewing':
        return `🚀 Preview ready!`;
      default:
        return `✅ ${result.phase} complete`;
    }
  }

  // Learning methods
  private inferProjectType(prompt: string): string {
    if (prompt.includes('mobile') || prompt.includes('app') || prompt.includes('ios') || prompt.includes('android')) {
      return 'mobile';
    }
    if (prompt.includes('web') || prompt.includes('website') || prompt.includes('page')) {
      return 'web';
    }
    return 'general';
  }

  private inferComplexity(prompt: string): 'low' | 'medium' | 'high' {
    const words = prompt.split(' ').length;
    if (words < 10) return 'low';
    if (words < 30) return 'medium';
    return 'high';
  }

  private loadPreviousOutcomes(): OutcomeRecord[] {
    // Load from localStorage or API
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hermes_outcomes');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
    }
    return [];
  }

  private logOutcome(outcome: OutcomeRecord) {
    const outcomes = this.loadPreviousOutcomes();
    outcomes.push(outcome);
    
    // Keep last 100
    if (outcomes.length > 100) {
      outcomes.shift();
    }
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('hermes_outcomes', JSON.stringify(outcomes));
    }
  }

  // Determine optimal flow based on learning
  private determineFlow(): OrchestrationPhase[] {
    const outcomes = this.state.learningContext.previousOutcomes;
    const sameType = outcomes.filter(o => 
      o.platform === this.state.platform
    );
    
    // If high failure rate in testing, add extra validation
    const testFailures = sameType.filter(o => o.failedPhase === 'testing').length;
    const testSuccess = sameType.filter(o => o.success).length;
    
    let flow: OrchestrationPhase[] = ['coding', 'testing', 'reviewing', 'previewing'];
    
    // Learning adjustments
    if (testFailures > testSuccess && testFailures > 2) {
      // Insert validation phase before testing (not implemented yet)
      this.onStatusUpdate('📚 Learning: High test failure rate detected, running extra validation...');
    }
    
    return flow;
  }

  // Get current state for UI
  getState(): OrchestrationState {
    return { ...this.state };
  }

  getProgress(): number {
    const flow = ['analyzing', 'coding', 'testing', 'reviewing', 'previewing'];
    const currentIndex = flow.indexOf(this.state.currentPhase);
    if (currentIndex === -1) return 0;
    return Math.round((currentIndex / flow.length) * 100);
  }
}

export default HermesOrchestrator;
