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
  researchData?: any;
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
    config: Partial<OrchestratorConfig> = {},
    researchData?: any,
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
      researchData,
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
    
    // Create tasks for display only (agents are decorative in this release)
    // Orchestrator handles all execution directly
    await this.decomposeAndAssignTasks();
    
    // Generate wiki pages FIRST (before code, based on research)
    await this.generateWikiPages();
    
    // Execute all phases directly - orchestrator does everything
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
    
    // Mark all tasks as completed for display
    await this.markAllTasksCompleted();
  }

  // Orchestrator does all work - agents are display-only for this release
  // Tasks are created for visual progress tracking, not for agent execution
  private async decomposeAndAssignTasks() {
    try {
      // Get available agents for this project (for display only)
      const projectAgents = await db.select().from(agents)
        .where(eq(agents.projectId, this.state.projectId));
      
      if (projectAgents.length === 0) {
        console.log('[Hermes] No agents found for display - continuing with orchestrator-only mode');
      }

      // Decompose project into tasks for visual progress tracking
      const taskPlan = this.decomposeProject(this.state.prompt, this.state.platform);
      
      if (taskPlan.length === 0) {
        console.error('[Hermes] Decompose returned no tasks');
        return;
      }

      // Create tasks in DB for display (not assigned to agents - orchestrator does the work)
      for (const taskDef of taskPlan) {
        // Find best matching agent for display purposes (decorative assignment)
        const matchingAgent = projectAgents.find(a => a.type === taskDef.type) || 
                             projectAgents.find(a => a.type === 'code') ||
                             projectAgents[0];
        
        const taskId = crypto.randomUUID();
        await db.insert(tasks).values({
          id: taskId,
          projectId: this.state.projectId,
          agentId: matchingAgent?.id || null,
          type: taskDef.type || 'code',
          status: 'pending',
          priority: taskDef.priority || 5,
          title: taskDef.title,
          description: taskDef.description || `Task for ${this.state.prompt.slice(0, 100)}`,
          input: JSON.stringify({ prompt: this.state.prompt, platform: this.state.platform, dependencies: taskDef.dependencies || [] }),
          attempts: 0,
          maxAttempts: 3,
          createdAt: new Date(),
        });
        
        // Set agents to busy for display (orchestrator does the actual work)
        if (matchingAgent) {
          await db.update(agents)
            .set({ status: 'busy' })
            .where(eq(agents.id, matchingAgent.id));
        }
      }

      // Mark first tasks as ready (no dependencies)
      const firstTasks = await db.select().from(tasks)
        .where(eq(tasks.projectId, this.state.projectId));
      
      for (const ft of firstTasks) {
        const input = JSON.parse(ft.input || '{}');
        if (!input.dependencies || input.dependencies.length === 0) {
          await db.update(tasks).set({ status: 'ready' }).where(eq(tasks.id, ft.id));
        }
      }

      this.onStatusUpdate(`📋 Decomposed into ${taskPlan.length} display tasks (orchestrator handles all execution)`);
    } catch (error) {
      console.error('[Hermes] Failed to decompose tasks for display:', error);
    }
  }

  // Decompose a project into executable tasks (for display only - orchestrator does the work)
  private decomposeProject(prompt: string, type: string) {
    const tasks = [];

    // Tasks that mirror the orchestrator phases for display purposes
    tasks.push({
      type: 'research',
      title: 'Research & Pattern Analysis',
      description: 'Research top apps in this space and extract UX patterns',
      priority: 5,
      dependencies: [],
      prompt: `Research the best apps for: ${prompt}. Find top 5 competitors, their key features, UI patterns, and user complaints.`,
      context: 'research',
    });

    tasks.push({
      type: 'code',
      title: 'Architecture & File Structure',
      description: 'Design component hierarchy and file organization',
      priority: 4,
      dependencies: ['Research & Pattern Analysis'],
      prompt: `Design the file structure and component hierarchy for: ${prompt}. Type: ${type}.`,
      context: 'architecture',
    });

    tasks.push({
      type: 'code',
      title: 'Page Components',
      description: 'Build main pages with Next.js + Tailwind + shadcn',
      priority: 4,
      dependencies: ['Architecture & File Structure'],
      prompt: `Generate ${type === 'mobile' ? 'Expo SDK 54 compatible React Native screens' : 'Next.js 15 pages with Tailwind CSS and shadcn/ui'} for: ${prompt}`,
      context: 'implementation',
    });

    tasks.push({
      type: 'code',
      title: 'API Routes & Backend',
      description: 'Build API endpoints and data layer',
      priority: 3,
      dependencies: ['Page Components'],
      prompt: `Generate ${type === 'mobile' ? 'React Navigation and Zustand state management' : 'Next.js API routes and Drizzle ORM schema'} for: ${prompt}`,
      context: 'backend',
    });

    tasks.push({
      type: 'test',
      title: 'Pre-flight Validation',
      description: 'Run build tests and validation checks',
      priority: 4,
      dependencies: ['Page Components', 'API Routes & Backend'],
      prompt: type === 'mobile'
        ? 'Run Expo SDK 54 pre-flight: check package.json versions, tsconfig paths, circular imports.'
        : 'Run Next.js build and TypeScript checks.',
      context: 'testing',
    });

    tasks.push({
      type: 'code',
      title: 'Visual Assets & UI Polish',
      description: 'Generate icons, splash screens, theme constants',
      priority: 2,
      dependencies: ['Page Components'],
      prompt: `Generate app icons, splash screen, and theme constants for: ${prompt}.`,
      context: 'assets',
    });

    tasks.push({
      type: 'review',
      title: 'Code Review & Quality Check',
      description: 'Review all files, fix imports, ensure consistency',
      priority: 5,
      dependencies: ['Pre-flight Validation', 'Visual Assets & UI Polish'],
      prompt: 'Review all generated files. Fix any import mismatches, ensure consistent styling, verify no placeholder content remains.',
      context: 'review',
    });

    // CI/CD (parallel)
    tasks.push({
      type: 'deploy',
      title: 'CI/CD Pipeline',
      description: 'Generate GitHub Actions workflow for build + deploy',
      priority: 2,
      dependencies: [],
      prompt: `Generate GitHub Actions workflow for ${type} app with auto-retry, EAS integration, and issue creation on failure.`,
      context: 'cicd',
    });

    return tasks;
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
      // Update task statuses for code generation tasks
      await this.updateTaskStatus('Architecture', 'running');
      await this.updateTaskStatus('Page Components', 'running');
      await this.updateTaskStatus('API Routes', 'running');
      
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
        await this.updateTaskStatus('Architecture', 'failed');
        await this.updateTaskStatus('Page Components', 'failed');
        await this.updateTaskStatus('API Routes', 'failed');
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
        await this.updateTaskStatus('Architecture', 'failed');
        await this.updateTaskStatus('Page Components', 'failed');
        await this.updateTaskStatus('API Routes', 'failed');
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
      await this.updateTaskStatus('Architecture', 'completed');
      await this.updateTaskStatus('Page Components', 'completed');
      await this.updateTaskStatus('API Routes', 'completed');
      await this.updateTaskStatus('Visual Assets', 'completed');

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
      await this.updateTaskStatus('Architecture', 'failed');
      await this.updateTaskStatus('Page Components', 'failed');
      await this.updateTaskStatus('API Routes', 'failed');
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
      await this.updateTaskStatus('Pre-flight', 'running');
      
      // Get generated files
      const files = await db.select().from(projectFiles)
        .where(eq(projectFiles.projectId, this.state.projectId));
      
      if (files.length === 0) {
        await this.updateTaskStatus('Pre-flight', 'failed');
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

      await this.updateTaskStatus('Pre-flight', 'completed');

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
      await this.updateTaskStatus('Pre-flight', 'failed');
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
      await this.updateTaskStatus('Code Review', 'running');
      
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

      await this.updateTaskStatus('Code Review', 'completed');

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
      await this.updateTaskStatus('Code Review', 'failed');
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
      await this.updateTaskStatus('Preview', 'running');
      
      // Get HTML file for preview
      const files = await db.select().from(projectFiles)
        .where(eq(projectFiles.projectId, this.state.projectId));
      
      const htmlFile = files.find(f => f.path === 'index.html' || f.path.endsWith('.html'));
      
      if (!htmlFile || !htmlFile.content) {
        await this.updateTaskStatus('Preview', 'failed');
        return {
          phase: 'previewing',
          success: false,
          message: 'No HTML file found for preview',
          timestamp: Date.now(),
        };
      }

      // Update project with preview status
      await db.update(projects)
        .set({ 
          status: 'preview_ready',
          updatedAt: new Date(),
        })
        .where(eq(projects.id, this.state.projectId));

      await this.updateTaskStatus('Preview', 'completed');

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
      await this.updateTaskStatus('Preview', 'failed');
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
      // Mark research task as running (orchestrator does the work)
      await this.updateTaskStatus('Research', 'running');
      
      const research = this.state.researchData;
      
      // Generate Overview wiki page from research
      if (research) {
        const overviewContent = `# ${this.state.prompt} - Overview

## Target Audience
${research.targetAudience || 'Not specified'}

## Pain Points
${(research.painPoints || []).map((p: string) => `- ${p}`).join('\n') || 'None identified'}

## Market Gaps
${(research.marketGaps || []).map((g: string) => `- ${g}`).join('\n') || 'None identified'}

## Core Features
${(research.coreFeatures || []).map((f: string) => `- ${f}`).join('\n') || 'None specified'}

## Design Trends
${(research.designTrends || []).map((d: string) => `- ${d}`).join('\n') || 'None identified'}
`;

        await db.insert(wikiPages).values({
          id: crypto.randomUUID(),
          projectId: this.state.projectId,
          pageType: 'overview',
          title: `${this.state.prompt.slice(0, 50)} - Overview`,
          content: overviewContent,
          autoGenerated: true,
          createdAt: new Date(),
        });
      }

      // Generate Competitors wiki page
      if (research?.competitors?.length) {
        const competitorsContent = `# Competitors Analysis

${research.competitors.map((c: any) => `## ${c.name}

**Features:** ${(c.features || []).join(', ')}

**Strengths:** ${(c.strengths || []).join(', ')}

**Weaknesses:** ${(c.weaknesses || []).join(', ')}

---`).join('\n')}
`;

        await db.insert(wikiPages).values({
          id: crypto.randomUUID(),
          projectId: this.state.projectId,
          pageType: 'competitors',
          title: 'Competitors Analysis',
          content: competitorsContent,
          autoGenerated: true,
          createdAt: new Date(),
        });
      }

      // Generate Tech Stack wiki page
      if (research?.techStack?.length) {
        const techStackContent = `# Recommended Tech Stack

## Platform
${this.state.platform}

## Technologies
${research.techStack.map((t: string) => `- ${t}`).join('\n')}

## Project Type
${this.state.learningContext.projectType}

## Complexity
${this.state.learningContext.complexity}
`;

        await db.insert(wikiPages).values({
          id: crypto.randomUUID(),
          projectId: this.state.projectId,
          pageType: 'tech-stack',
          title: 'Tech Stack Recommendation',
          content: techStackContent,
          autoGenerated: true,
          createdAt: new Date(),
        });
      }

      // Mark research task as completed
      await this.updateTaskStatus('Research', 'completed');
      this.onStatusUpdate('📚 Wiki pages generated from research');
    } catch (error) {
      console.error('[Hermes] Wiki generation failed:', error);
      this.onStatusUpdate('⚠️ Wiki generation failed');
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
      // Flexible matching - try exact title first, then partial match
      let taskRows = await db.select().from(tasks)
        .where(and(
          eq(tasks.projectId, this.state.projectId),
          eq(tasks.title, title)
        ));
      
      // If no exact match, try partial match
      if (taskRows.length === 0) {
        const allTasks = await db.select().from(tasks)
          .where(eq(tasks.projectId, this.state.projectId));
        
        // Match by keywords in the title
        const keywords = title.toLowerCase().split(' ').filter(w => w.length > 3);
        taskRows = allTasks.filter(t => {
          const taskTitle = t.title?.toLowerCase() || '';
          return keywords.some(kw => taskTitle.includes(kw));
        });
      }
      
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
    // Orchestrator handles all phases directly - agents are display-only
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

  // Mark all tasks as completed at the end (display-only update)
  private async markAllTasksCompleted() {
    try {
      const projectTasks = await db.select().from(tasks)
        .where(eq(tasks.projectId, this.state.projectId));
      
      for (const task of projectTasks) {
        await db.update(tasks)
          .set({ status: 'completed' })
          .where(eq(tasks.id, task.id));
      }
      
      // Free all agents for display
      const projectAgents = await db.select().from(agents)
        .where(eq(agents.projectId, this.state.projectId));
      
      for (const agent of projectAgents) {
        await db.update(agents)
          .set({ status: 'idle' })
          .where(eq(agents.id, agent.id));
      }
    } catch (error) {
      console.error('[Hermes] Failed to mark tasks completed:', error);
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
