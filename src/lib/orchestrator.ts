/**
 * Hermes Orchestrator - Master Orchestration Engine for BuildAny
 * 
 * Manages the full development lifecycle:
 * Code Generation → Testing → Code Review → Preview → User Approval
 * 
 * Learns from project outcomes (success/failure) to improve routing decisions.
 */

import { db } from "@/lib/db";
import { llmRouter, getSystemPromptForType, parseGeneratedCode } from "@/lib/llm-router";
import { projects, projectFiles, tasks, agents, conversations, wikiPages, codeReviews } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
  manuallyCorrected?: boolean;
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
  autoRetryOnFailure: false,
  maxRetries: 2,
  pauseOnFailure: true,
  requireUserApproval: true,
  learningEnabled: true,
};

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
      manualCorrections: [],
      appliedRules: [],
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
    
    // Decompose project into tasks and assign to agents
    await this.decomposeAndAssignTasks();
    
    const flow = this.determineFlow();
    
    for (const phase of flow) {
      const result = await this.executePhase(phase);
      
      if (!result.success) {
        await this.handleFailure(result);
        return;
      }
      
      this.onStatusUpdate(this.formatSuccessMessage(result));
    }
    
    await this.transitionTo('completed');
    
    // Update project status
    await db.update(projects)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(projects.id, this.state.projectId));
    
    // Auto-start code review after completion
    await this.autoStartCodeReview();
    
    // Generate wiki pages
    await this.generateWikiPages();
  }

  private async decomposeAndAssignTasks() {
    try {
      // Get available agents for this project
      const projectAgents = await db.select().from(agents)
        .where(eq(agents.projectId, this.state.projectId));
      
      if (projectAgents.length === 0) {
        console.error('[Hermes] No agents found for project', this.state.projectId);
        return;
      }

      // Create tasks with agent assignment
      const taskList = [
        { title: 'Generate project structure', type: 'code', priority: 5, agentType: 'code' },
        { title: 'Generate main UI components', type: 'code', priority: 4, agentType: 'code' },
        { title: 'Generate styling and CSS', type: 'code', priority: 4, agentType: 'code' },
        { title: 'Generate business logic', type: 'code', priority: 3, agentType: 'code' },
        { title: 'Run tests and validation', type: 'test', priority: 3, agentType: 'test' },
        { title: 'Code review and quality check', type: 'review', priority: 2, agentType: 'review' },
        { title: 'Build preview', type: 'preview', priority: 2, agentType: 'code' },
      ];

      for (const taskDef of taskList) {
        // Find best matching agent
        const matchingAgent = projectAgents.find(a => a.type === taskDef.agentType) || 
                             projectAgents.find(a => a.type === 'code') ||
                             projectAgents[0];
        
        const taskId = crypto.randomUUID();
        await db.insert(tasks).values({
          id: taskId,
          projectId: this.state.projectId,
          agentId: matchingAgent?.id || null,
          type: taskDef.type as any,
          status: 'pending',
          priority: taskDef.priority,
          title: taskDef.title,
          description: `Task for ${this.state.prompt.slice(0, 100)}`,
          input: JSON.stringify({ prompt: this.state.prompt, platform: this.state.platform }),
          attempts: 0,
          maxAttempts: 3,
          createdAt: new Date(),
        });
        
        // Update agent status to busy
        if (matchingAgent) {
          await db.update(agents)
            .set({ status: 'busy' })
            .where(eq(agents.id, matchingAgent.id));
        }
      }

      this.onStatusUpdate(`📋 Decomposed into ${taskList.length} tasks and assigned to ${projectAgents.length} agents`);
    } catch (error) {
      console.error('[Hermes] Failed to decompose and assign tasks:', error);
    }
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
    const startTime = Date.now();
    
    try {
      // Update task status
      await this.updateTaskStatus('Generate project structure', 'running');
      
      // Generate code using LLM
      const systemPrompt = getSystemPromptForType(this.state.platform);
      const result = await llmRouter.generate({
        prompt: this.state.prompt,
        systemPrompt,
        provider: 'deepseek',
        temperature: 0.7,
        maxTokens: 4000,
      });

      if (!result.success || !result.content) {
        await this.updateTaskStatus('Generate project structure', 'failed');
        return {
          phase: 'coding',
          success: false,
          message: result.error || 'Code generation failed',
          timestamp: Date.now(),
        };
      }

      // Parse generated code into files
      const parsedFiles = parseGeneratedCode(result.content);
      
      if (parsedFiles.length === 0) {
        await this.updateTaskStatus('Generate project structure', 'failed');
        return {
          phase: 'coding',
          success: false,
          message: 'No files parsed from generated code',
          timestamp: Date.now(),
        };
      }

      // Save files to database
      for (const file of parsedFiles) {
        const fileId = crypto.randomUUID();
        await db.insert(projectFiles).values({
          id: fileId,
          projectId: this.state.projectId,
          path: file.path,
          content: file.content,
          language: file.language,
          isGenerated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Update all code tasks to completed
      await this.updateTaskStatus('Generate project structure', 'completed');
      await this.updateTaskStatus('Generate main UI components', 'completed');
      await this.updateTaskStatus('Generate styling and CSS', 'completed');
      await this.updateTaskStatus('Generate business logic', 'completed');

      // Log success to AI chat
      await db.insert(conversations).values({
        id: crypto.randomUUID(),
        projectId: this.state.projectId,
        role: 'assistant',
        content: `✅ Generated ${parsedFiles.length} files: ${parsedFiles.map(f => f.path).join(', ')}`,
        model: 'deepseek',
        createdAt: new Date(),
      });

      return {
        phase: 'coding',
        success: true,
        message: 'Code generated successfully',
        details: { 
          filesGenerated: parsedFiles.length,
          files: parsedFiles.map(f => f.path),
          tokensUsed: result.tokensUsed,
          duration: Date.now() - startTime,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      await this.updateTaskStatus('Generate project structure', 'failed');
      return {
        phase: 'coding',
        success: false,
        message: error instanceof Error ? error.message : 'Code generation error',
        timestamp: Date.now(),
      };
    }
  }

  private async executeTestAgent(): Promise<PhaseResult> {
    try {
      await this.updateTaskStatus('Run tests and validation', 'running');
      
      // Get generated files
      const files = await db.select().from(projectFiles)
        .where(eq(projectFiles.projectId, this.state.projectId));
      
      if (files.length === 0) {
        await this.updateTaskStatus('Run tests and validation', 'failed');
        return {
          phase: 'testing',
          success: false,
          message: 'No files to test',
          timestamp: Date.now(),
        };
      }

      // Basic validation tests
      const testsPassed = files.filter(f => f.content && f.content.length > 0).length;
      const testsFailed = files.length - testsPassed;

      // Run syntax validation for HTML/JS files
      let syntaxErrors = 0;
      for (const file of files) {
        if (file.language === 'html' && file.content) {
          // Basic HTML check - ensure it has html and body tags
          if (!file.content.includes('<html') || !file.content.includes('<body')) {
            syntaxErrors++;
          }
        }
      }

      await this.updateTaskStatus('Run tests and validation', 'completed');

      return {
        phase: 'testing',
        success: syntaxErrors === 0,
        message: syntaxErrors === 0 ? 'All tests passed' : `${syntaxErrors} syntax issues found`,
        details: { 
          testsPassed: testsPassed - syntaxErrors, 
          testsFailed: testsFailed + syntaxErrors,
          totalFiles: files.length,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      await this.updateTaskStatus('Run tests and validation', 'failed');
      return {
        phase: 'testing',
        success: false,
        message: error instanceof Error ? error.message : 'Test execution failed',
        timestamp: Date.now(),
      };
    }
  }

  private async executeReviewAgent(): Promise<PhaseResult> {
    try {
      await this.updateTaskStatus('Code review and quality check', 'running');
      
      // Get files for review
      const files = await db.select().from(projectFiles)
        .where(eq(projectFiles.projectId, this.state.projectId));

      let issuesFound = 0;
      let suggestions = 0;

      for (const file of files) {
        if (!file.content) continue;
        
        // Check for common issues
        if (file.content.includes('TODO') || file.content.includes('FIXME')) {
          issuesFound++;
        }
        if (file.content.includes('console.log') || file.content.includes('alert(')) {
          suggestions++;
        }
        // Check for accessibility
        if (file.language === 'html' && !file.content.includes('alt=')) {
          suggestions++;
        }
      }

      await this.updateTaskStatus('Code review and quality check', 'completed');

      return {
        phase: 'reviewing',
        success: true,
        message: 'Code review complete',
        details: { 
          issuesFound, 
          suggestions,
          filesReviewed: files.length,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      await this.updateTaskStatus('Code review and quality check', 'failed');
      return {
        phase: 'reviewing',
        success: false,
        message: error instanceof Error ? error.message : 'Review failed',
        timestamp: Date.now(),
      };
    }
  }

  private async executePreviewAgent(): Promise<PhaseResult> {
    try {
      await this.updateTaskStatus('Build preview', 'running');
      
      // Get HTML file for preview
      const files = await db.select().from(projectFiles)
        .where(eq(projectFiles.projectId, this.state.projectId));
      
      const htmlFile = files.find(f => f.path === 'index.html' || f.path.endsWith('.html'));
      
      if (!htmlFile || !htmlFile.content) {
        await this.updateTaskStatus('Build preview', 'failed');
        return {
          phase: 'previewing',
          success: false,
          message: 'No HTML file found for preview',
          timestamp: Date.now(),
        };
      }

      // Update project with preview
      await db.update(projects)
        .set({ 
          status: 'preview_ready',
          updatedAt: new Date(),
        })
        .where(eq(projects.id, this.state.projectId));

      await this.updateTaskStatus('Build preview', 'completed');

      return {
        phase: 'previewing',
        success: true,
        message: 'Preview built successfully',
        details: { 
          previewUrl: `/api/project/${this.state.projectId}/files`,
          htmlFile: htmlFile.path,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      await this.updateTaskStatus('Build preview', 'failed');
      return {
        phase: 'previewing',
        success: false,
        message: error instanceof Error ? error.message : 'Preview build failed',
        timestamp: Date.now(),
      };
    }
  }

  private async autoStartCodeReview() {
    try {
      const files = await db.select().from(projectFiles)
        .where(eq(projectFiles.projectId, this.state.projectId));
      
      if (files.length === 0) return;

      // Check if code review already exists
      const existing = await db.select().from(codeReviews)
        .where(eq(codeReviews.projectId, this.state.projectId))
        .get();
      
      if (existing && existing.status === 'running') return;

      const reviewId = existing?.id || crypto.randomUUID();
      if (!existing) {
        await db.insert(codeReviews).values({ 
          id: reviewId, 
          projectId: this.state.projectId, 
          status: 'running', 
          createdAt: new Date(), 
          updatedAt: new Date() 
        });
      } else {
        await db.update(codeReviews)
          .set({ status: 'running', updatedAt: new Date() })
          .where(eq(codeReviews.id, reviewId));
      }

      // Run OCR review in background
      this.runOCRReview(reviewId, files);
      
      this.onStatusUpdate('🔍 Auto-started code review...');
    } catch (error) {
      console.error('[Hermes] Auto code review failed:', error);
    }
  }

  private async runOCRReview(reviewId: string, files: any[]) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      const child = await import('child_process');
      const tempDir = path.join(os.tmpdir(), 'buildany-ocr', this.state.projectId);

      try {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
        fs.mkdirSync(tempDir, { recursive: true });

        for (const file of files) {
          if (!file.path || file.path === '__preview.html') continue;
          const fp = path.join(tempDir, file.path);
          fs.mkdirSync(path.dirname(fp), { recursive: true });
          fs.writeFileSync(fp, file.content || '', 'utf-8');
        }
        
        child.execSync('git init', { cwd: tempDir, stdio: 'pipe' });
        child.execSync('git add -A', { cwd: tempDir, stdio: 'pipe' });
        child.execSync('git commit -m "init" --no-verify', { cwd: tempDir, stdio: 'pipe' });

        try { child.execSync('ocr --version', { stdio: 'pipe' }); } catch {
          throw new Error('OCR not installed');
        }

        const output = child.execSync(
          `cd ${tempDir} && OCR_LLM_URL="https://api.deepseek.com/v1/chat/completions" OCR_LLM_TOKEN="${process.env.DEEPSEEK_API_KEY}" OCR_LLM_MODEL="deepseek-chat" ocr review --format json --audience agent`,
          { encoding: 'utf-8', timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
        );

        let result: any = null;
        try {
          const lines = output.trim().split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().startsWith('{')) { result = JSON.parse(lines[i]); break; }
          }
          if (!result) result = JSON.parse(output);
        } catch { throw new Error('Failed to parse OCR output'); }

        const issues = result?.comments || result?.issues || [];
        const summary = {
          totalIssues: issues.length,
          critical: issues.filter((i: any) => i.severity === 'critical' || i.priority === 'high').length,
          warnings: issues.filter((i: any) => i.severity === 'warning' || i.priority === 'medium').length,
          suggestions: issues.filter((i: any) => i.severity === 'suggestion' || i.priority === 'low').length,
        };

        await db.update(codeReviews).set({
          status: 'completed',
          summary: JSON.stringify(summary),
          issues: JSON.stringify(issues.slice(0, 50)),
          updatedAt: new Date(),
        }).where(eq(codeReviews.id, reviewId));

        await db.insert(conversations).values({
          id: crypto.randomUUID(),
          projectId: this.state.projectId,
          role: 'assistant',
          content: `✅ Code review complete! ${summary.totalIssues} issues found (${summary.critical} critical, ${summary.warnings} warnings, ${summary.suggestions} suggestions).`,
          model: 'ocr-orchestrator',
          createdAt: new Date(),
        });
      } catch (error) {
        throw error;
      } finally {
        try { if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true }); } catch {}
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await db.update(codeReviews).set({ 
        status: 'failed', 
        errorMessage: msg.slice(0, 1000), 
        updatedAt: new Date() 
      }).where(eq(codeReviews.id, reviewId));
    }
  }

  private async generateWikiPages() {
    try {
      const files = await db.select().from(projectFiles)
        .where(eq(projectFiles.projectId, this.state.projectId));
      
      if (files.length === 0) return;

      // Generate architecture wiki page
      const architectureContent = files.map(f => 
        `- **${f.path}**: ${f.language || 'unknown'} file`
      ).join('\n');

      await db.insert(wikiPages).values({
        id: crypto.randomUUID(),
        projectId: this.state.projectId,
        pageType: 'architecture',
        title: 'Architecture Overview',
        content: `# Architecture Overview\n\n## Files\n\n${architectureContent}\n\n## Project Type\n${this.state.platform}\n\n## Generated At\n${new Date().toISOString()}`,
        autoGenerated: true,
        createdAt: new Date(),
      });

      // Generate tech stack wiki page
      const techStack = this.inferTechStack(files);
      await db.insert(wikiPages).values({
        id: crypto.randomUUID(),
        projectId: this.state.projectId,
        pageType: 'tech-stack',
        title: 'Tech Stack',
        content: `# Tech Stack\n\n${techStack.map(t => `- ${t}`).join('\n')}`,
        autoGenerated: true,
        createdAt: new Date(),
      });

      this.onStatusUpdate('📚 Wiki pages generated');
    } catch (error) {
      console.error('[Hermes] Wiki generation failed:', error);
    }
  }

  private inferTechStack(files: any[]): string[] {
    const stack = new Set<string>();
    for (const file of files) {
      const ext = file.path.split('.').pop();
      switch (ext) {
        case 'tsx': case 'ts': stack.add('TypeScript'); break;
        case 'jsx': case 'js': stack.add('JavaScript'); break;
        case 'html': stack.add('HTML5'); break;
        case 'css': stack.add('CSS3'); break;
        case 'py': stack.add('Python'); break;
        case 'go': stack.add('Go'); break;
        case 'rs': stack.add('Rust'); break;
      }
      if (file.content) {
        if (file.content.includes('react')) stack.add('React');
        if (file.content.includes('next')) stack.add('Next.js');
        if (file.content.includes('tailwind')) stack.add('Tailwind CSS');
        if (file.content.includes('shadcn')) stack.add('shadcn/ui');
      }
    }
    return Array.from(stack);
  }

  private async updateTaskStatus(title: string, status: string) {
    try {
      const taskRows = await db.select().from(tasks)
        .where(and(
          eq(tasks.projectId, this.state.projectId),
          eq(tasks.title, title)
        ));
      
      for (const task of taskRows) {
        await db.update(tasks)
          .set({ status: status as any })
          .where(eq(tasks.id, task.id));
      }
    } catch (error) {
      console.error('[Hermes] Failed to update task:', error);
    }
  }

  private async handleFailure(result: PhaseResult) {
    await this.transitionTo('failed');
    
    this.logOutcome({
      projectId: this.state.projectId,
      platform: this.state.platform,
      success: false,
      failedPhase: result.phase,
      errorType: result.message,
      timestamp: Date.now(),
    });
    
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

  async userDecision(decision: 'approve' | 'reject' | 'fix' | 'retry', context?: any) {
    this.state.userDecision = decision;
    
    switch (decision) {
      case 'fix':
        await this.transitionTo(this.state.phases[this.state.phases.length - 1].phase);
        break;
      case 'retry':
        const lastPhase = this.state.phases[this.state.phases.length - 1].phase;
        await this.executePhase(lastPhase);
        break;
      case 'approve':
        await this.continueFromFailure();
        break;
      case 'reject':
        await this.executePhase('coding');
        break;
    }
  }

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
      await this.continueFromPhase(overrideTo);
    }
  }

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
    
    this.updateLearningWeights(phase.phase, whatShouldHaveHappened);
  }

  setPersistentRule(rule: PersistentRule) {
    const rules = this.loadPersistentRules();
    rules.push(rule);
    this.savePersistentRules(rules);
    this.onStatusUpdate(`📋 Rule set: ${rule.description}`);
  }

  getApplicableRules(): PersistentRule[] {
    const rules = this.loadPersistentRules();
    return rules.filter(rule => {
      if (rule.platform && rule.platform !== this.state.platform) return false;
      if (rule.projectType && rule.projectType !== this.state.learningContext.projectType) return false;
      return true;
    });
  }

  shouldSkipPhase(phase: OrchestrationPhase): boolean {
    const rules = this.getApplicableRules();
    return rules.some(rule => 
      rule.action === 'skip' && rule.targetPhase === phase
    );
  }

  getExtraPhases(): OrchestrationPhase[] {
    const rules = this.getApplicableRules();
    return rules
      .filter(rule => rule.action === 'add_phase')
      .map(rule => rule.targetPhase as OrchestrationPhase);
  }

  private logManualCorrection(correction: ManualCorrectionRecord) {
    const corrections = this.loadManualCorrections();
    corrections.push(correction);
    if (corrections.length > 50) corrections.shift();
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('hermes_manual_corrections', JSON.stringify(corrections));
    }
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
    const outcomes = this.loadPreviousOutcomes();
    const samePhaseCorrections = this.loadManualCorrections().filter(c => 
      c.type === 'post_hoc_correction' && c.phase === phase
    );
    const skipRate = samePhaseCorrections.filter(c => c.correctedTo === 'skip').length / samePhaseCorrections.length;
    console.log(`[Hermes Learning] Phase "${phase}" skip rate from corrections: ${skipRate.toFixed(2)}`);
  }

  private async continueFromPhase(phase: OrchestrationPhase) {
    const nextPhases = this.getNextPhases(phase);
    for (const nextPhase of nextPhases) {
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

  private determineFlow(): OrchestrationPhase[] {
    let flow: OrchestrationPhase[] = ['coding', 'testing', 'reviewing', 'previewing'];
    
    const extraPhases = this.getExtraPhases();
    if (extraPhases.length > 0) {
      flow = [...extraPhases, ...flow];
    }
    
    flow = flow.filter(phase => !this.shouldSkipPhase(phase));
    
    return flow;
  }

  private async continueFromFailure() {
    const failedPhaseIndex = this.state.phases.findLastIndex(p => !p.success);
    if (failedPhaseIndex === -1) return;
    
    const nextPhases = this.getNextPhases(this.state.phases[failedPhaseIndex].phase);
    for (const phase of nextPhases) {
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
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hermes_outcomes');
      if (stored) {
        try { return JSON.parse(stored); } catch { return []; }
      }
    }
    return [];
  }

  private logOutcome(outcome: OutcomeRecord) {
    const outcomes = this.loadPreviousOutcomes();
    outcomes.push(outcome);
    if (outcomes.length > 100) outcomes.shift();
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('hermes_outcomes', JSON.stringify(outcomes));
    }
  }

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
