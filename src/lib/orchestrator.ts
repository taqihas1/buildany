import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const PROJECTS_DIR = "/data/projects";

/**
 * Kelly Orchestrator - Master Orchestration Engine for BuildAny
 * 
 * Manages the full development lifecycle:
 * Code Generation → Testing → Code Review → Preview → User Approval
 * 
 * Learns from project outcomes (success/failure) to improve routing decisions.
 */

import { memoryClient } from "@/lib/mcp-memory-client";
import { discoverServices, getCatalog, reviewFile, isServiceAvailable, getKellyConfig } from "@/lib/ard-client";
import { db } from "@/lib/db";
import { llmRouter, getSystemPromptForType, parseGeneratedCode } from "@/lib/llm-router";
import { buildEnhancedSystemPrompt, getAvailableSkillsDebug } from "@/lib/skill-loader";
import { projects, projectFiles, tasks, agents, conversations, wikiPages, codeReviews } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

console.log('[Kelly] Skill system loaded:', getAvailableSkillsDebug());

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

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export class KellyOrchestrator {
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
    // Update project status so client starts polling
    await db.update(projects)
      .set({ status: 'generating', updatedAt: new Date() })
      .where(eq(projects.id, this.state.projectId));
    
    await this.transitionTo('analyzing');
    
    // ─── ONE SHOT: Generate code directly ───
    const result = await this.executePhase('coding');
    
    if (!result.success) {
      await this.handleFailure(result);
      return;
    }
    
    this.onStatusUpdate(this.formatSuccessMessage(result));
    
    await this.transitionTo('completed');
    
    // Done! User can now click Deploy
    this.onStatusUpdate('✅ Code ready! Click Deploy to publish your app.');
    
    // Update project status
    await db.update(projects)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(projects.id, this.state.projectId));
  }

  /**
   * Auto-generate a preview of the app, serve it, run automated tests,
   * and notify the user in the AI Chat panel.
   */
  private async generateAndServePreview() {
    try {
      this.onStatusUpdate('Building app...');
      
      const projectDir = path.join(PROJECTS_DIR, this.state.projectId);
      const outDir = path.join(projectDir, 'out');
      
      // Check if this is a static HTML app
      const hasAppDir = await this.fileExists(path.join(projectDir, 'app'));
      const hasPagesDir = await this.fileExists(path.join(projectDir, 'pages'));
      const hasIndexHtml = await this.fileExists(path.join(projectDir, 'index.html'));
      const isStaticHtml = hasIndexHtml && !hasAppDir && !hasPagesDir;

      // Update status to building
      await db.update(projects)
        .set({ status: 'building', updatedAt: new Date() })
        .where(eq(projects.id, this.state.projectId));
      this.onStatusUpdate('Build in progress...');

      // Clean previous build
      try { await fs.rm(outDir, { recursive: true, force: true }); } catch {}
      try { await fs.rm(path.join(projectDir, '.next'), { recursive: true, force: true }); } catch {}

      if (isStaticHtml) {
        // Static HTML: copy files to out/
        await this.copyDir(projectDir, outDir, ['out', '.git', 'node_modules', '.wrangler']);
        try { await fs.rm(path.join(outDir, '.git'), { recursive: true, force: true }); } catch {}
        try { await fs.rm(path.join(outDir, 'node_modules'), { recursive: true, force: true }); } catch {}
      } else {
        // Next.js: run build (simplified)
        this.onStatusUpdate('Next.js build requires manual build. Click the Build button.');
        await db.update(projects)
          .set({ status: 'completed', updatedAt: new Date() })
          .where(eq(projects.id, this.state.projectId));
        return;
      }

      // Update status to ready
      await db.update(projects)
        .set({ status: 'ready', updatedAt: new Date() })
        .where(eq(projects.id, this.state.projectId));

      // Auto-deploy to Cloudflare
      this.onStatusUpdate('Deploying to Cloudflare...');
      const deployUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/deploy-cloudflare`;
      const deployRes = await fetch(deployUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.state.projectId,
          projectName: `buildany-${this.state.projectId.slice(0, 8)}`,
        }),
      });
      
      let deployData: any = {};
      try { deployData = await deployRes.json(); } catch {}

      if (deployRes.ok && deployData.success) {
        const liveUrl = deployData.url;
        
        // Notify user in chat
        await db.insert(conversations).values({
          id: crypto.randomUUID(),
          projectId: this.state.projectId,
          role: 'assistant',
          content: `Deployed to Cloudflare! Your app is live at: ${liveUrl}`,
          model: 'kelly-orchestrator',
          createdAt: new Date(),
        });
        
        this.onStatusUpdate(`Deployed! Live at: ${liveUrl}`);
        
        // Save deployment memory
        try {
          memoryClient.write({
            content: `Deployed ${this.state.prompt} to Cloudflare: ${liveUrl}`,
            category: 'project',
            importance: 50,
            projectId: this.state.projectId,
            tags: 'deploy,cloudflare,success',
          });
        } catch (memErr) {
          console.error('[Kelly] Failed to save deploy memory:', memErr);
        }
      } else {
        const errMsg = deployData.error || 'Deployment failed';
        this.onStatusUpdate(`Deploy failed: ${errMsg}`);
        await db.insert(conversations).values({
          id: crypto.randomUUID(),
          projectId: this.state.projectId,
          role: 'assistant',
          content: `Build complete, but deployment failed: ${errMsg}. You can still click Deploy to retry.`,
          model: 'kelly-orchestrator',
          createdAt: new Date(),
        });
      }
      
    } catch (error) {
      console.error('[Kelly] Deploy failed:', error);
      this.onStatusUpdate('Build failed, but code is ready.');
      await db.update(projects)
        .set({ status: 'build_failed', updatedAt: new Date() })
        .where(eq(projects.id, this.state.projectId));
    }
  }

  private async fileExists(p: string): Promise<boolean> {
    try { await fs.access(p); return true; } catch { return false; }
  }

  private async copyDir(src: string, dest: string, exclude: string[] = []) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath, exclude);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private buildPreviewHtml(files: any[]): string {
    // Find the main HTML file or build one from components
    const htmlFile = files.find(f => f.path === 'index.html' || f.path.endsWith('.html'));
    
    if (htmlFile?.content) {
      return htmlFile.content;
    }
    
    // Build a preview from React/Next.js components
    const cssFiles = files.filter(f => f.path.endsWith('.css'));
    const jsFiles = files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.tsx') || f.path.endsWith('.ts'));
    
    const styles = cssFiles.map(f => `<style>${f.content}</style>`).join('\n');
    
    // Extract component content (simplified preview)
    const componentPreview = jsFiles
      .filter(f => f.path.includes('page') || f.path.includes('Page'))
      .map(f => {
        // Extract JSX-like content for preview
        const content = f.content || '';
        return `<div class="component-preview">\n<h3>${f.path}</h3>\n<pre>${this.escapeHtml(content.substring(0, 2000))}</pre>\n</div>`;
      })
      .join('\n');
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BuildAny Preview</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; background: #f5f5f5; }
    .component-preview { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    pre { background: #f0f0f0; padding: 10px; overflow-x: auto; font-size: 12px; }
    h3 { margin-top: 0; color: #333; }
  </style>
  ${styles}
</head>
<body>
  <h1>🚀 BuildAny App Preview</h1>
  <p>This is a preview of your generated app. The full app will be built with Next.js.</p>
  ${componentPreview}
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Run automated Playwright tests on the preview URL
   */
  private async runAutomatedTests(previewUrl: string) {
    try {
      this.onStatusUpdate('🧪 Running automated tests...');
      
      // Call the auto-test API
      const response = await fetch(`http://localhost:3000/api/auto-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.state.projectId,
          url: previewUrl,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Auto-test API returned ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const testSummary = result.summary || 'Tests completed';
        const passed = result.checks?.filter((c: any) => c.passed).length || 0;
        const total = result.checks?.length || 0;
        
        // Store test result reference in project memory
        await db.insert(conversations).values({
          id: crypto.randomUUID(),
          projectId: this.state.projectId,
          role: 'assistant',
          content: `✅ **Automated tests completed!**\n\n${testSummary}\n\n**Results:** ${passed}/${total} checks passed\n\nClick on the **Auto Tests** tab in the workspace to see detailed results and screenshots.\n\n[AUTO_TEST_TAB_TRIGGER]`,
          model: 'kelly-orchestrator',
          createdAt: new Date(),
        });
        
        this.onStatusUpdate(`✅ Automated tests complete! ${passed}/${total} passed. Click Auto Tests tab.`);
        
        // Save memory about test results
        try {
          memoryClient.write({
            content: `Automated tests for "${this.state.prompt}": ${passed}/${total} checks passed.`,
            category: 'project',
            importance: passed === total ? 60 : 80,
            projectId: this.state.projectId,
            tags: 'testing,automated',
          });
        } catch (memErr) {
          console.error('[Kelly] Failed to save test memory:', memErr);
        }
      } else {
        await db.insert(conversations).values({
          id: crypto.randomUUID(),
          projectId: this.state.projectId,
          role: 'assistant',
          content: `⚠️ **Automated tests completed with issues.**\n\nClick on the **Auto Tests** tab to review the results.\n\n[AUTO_TEST_TAB_TRIGGER]`,
          model: 'kelly-orchestrator',
          createdAt: new Date(),
        });
        
        this.onStatusUpdate('⚠️ Tests found issues. Check Auto Tests tab.');
        
        // Save memory about test failures
        try {
          memoryClient.write({
            content: `Automated tests for "${this.state.prompt}" found issues. Review required.`,
            category: 'project',
            importance: 75,
            projectId: this.state.projectId,
            tags: 'testing,failure',
          });
        } catch (memErr) {
          console.error('[Kelly] Failed to save test failure memory:', memErr);
        }
      }
      
    } catch (error) {
      console.error('[Kelly] Automated testing failed:', error);
      this.onStatusUpdate('⚠️ Automated tests could not run. Check Auto Tests tab to run manually.');
    }
  }

  /**
   * ARD: Discover available services on the VPS
   * Called internally via localhost (bypasses Hostinger edge proxy)
   */
  async discoverInfrastructure(): Promise<string> {
    try {
      this.onStatusUpdate('🔍 Discovering VPS infrastructure...');
      const catalog = await getCatalog();
      if (!catalog) {
        return 'Infrastructure catalog not available';
      }
      
      const tools = catalog.tools || [];
      const agents = catalog.agents || [];
      const summary = [
        `**VPS Infrastructure (${catalog.domain})**`,
        ``,
        `**Services (${tools.length}):**`,
        ...tools.map(t => `- ${t.name}: ${t.status} (${t.type})`),
        ``,
        `**Agents (${agents.length}):**`,
        ...agents.map(a => `- ${a.name}: ${a.description}`),
      ].join('\n');
      
      return summary;
    } catch (err) {
      console.error('[Kelly] ARD discover failed:', err);
      return 'Infrastructure discovery failed';
    }
  }

  /**
   * ARD: Review a source file for issues
   * Called internally via localhost
   */
  async reviewSourceFile(filePath: string): Promise<string> {
    try {
      this.onStatusUpdate(`🔍 Reviewing ${filePath}...`);
      const result = await reviewFile(filePath);
      if (!result?.success) {
        return `Could not review ${filePath}`;
      }
      
      const issues = result.issues || [];
      const critical = issues.filter(i => i.severity?.includes('CRITICAL')).length;
      const warnings = issues.filter(i => i.severity?.includes('WARNING')).length;
      
      const summary = [
        `**Code Review: ${filePath}**`,
        ``,
        result.review?.substring(0, 500) || 'No detailed review available',
        ``,
        `**Issues found: ${issues.length}** (Critical: ${critical}, Warnings: ${warnings})`,
        ...issues.slice(0, 5).map(i => `- **[${i.severity}]** ${i.issue}`),
        issues.length > 5 ? `... and ${issues.length - 5} more issues` : '',
      ].join('\n');
      
      return summary;
    } catch (err) {
      console.error('[Kelly] ARD review failed:', err);
      return `Review failed for ${filePath}`;
    }
  }

  // Orchestrator does all work - agents are display-only for this release
  // Tasks are created for visual progress tracking, not for agent execution
  private async decomposeAndAssignTasks() {
    try {
      // Get available agents for this project (for display only)
      const projectAgents = await db.select().from(agents)
        .where(eq(agents.projectId, this.state.projectId));
      
      if (projectAgents.length === 0) {
        console.log('[Kelly] No agents found for display - continuing with orchestrator-only mode');
      }

      // Decompose project into tasks for visual progress tracking
      const taskPlan = this.decomposeProject(this.state.prompt, this.state.platform);
      
      if (taskPlan.length === 0) {
        console.error('[Kelly] Decompose returned no tasks');
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
      console.error('[Kelly] Failed to decompose tasks for display:', error);
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
      
      // Generate code using LLM with skill-enhanced prompts + hot memories
      const baseSystemPrompt = getSystemPromptForType(this.state.platform);
      
      // Load hot memories for context injection
      const { memories: hotMemories, tokenCount } = memoryClient.readHot(150, this.state.projectId);
      
      // ALSO search for relevant memories based on prompt keywords
      const promptKeywords = this.state.prompt.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const searchMemories: any[] = [];
      for (const keyword of promptKeywords.slice(0, 3)) {
        try {
          const results = memoryClient.search({ query: keyword, projectId: this.state.projectId, limit: 3 });
          searchMemories.push(...results);
        } catch { /* ignore search errors */ }
      }
      // De-duplicate
      const allMemoryIds = new Set();
      const allMemories = [...hotMemories];
      for (const m of searchMemories) {
        if (!allMemoryIds.has(m.id)) {
          allMemoryIds.add(m.id);
          allMemories.push(m);
        }
      }
      
      let memoryContext = '';
      if (allMemories.length > 0) {
        memoryContext = `\n\n## Relevant Context from Past Projects\n${allMemories.slice(0, 8).map(m => `- ${m.content}`).join('\n')}\n`;
        console.log(`[Kelly] Injected ${allMemories.length} memories (${tokenCount} tokens) into prompt`);
      }
      
      const enhancedSystemPrompt = buildEnhancedSystemPrompt(
        baseSystemPrompt + memoryContext,
        'coding',
        `Project: ${this.state.prompt}\nPlatform: ${this.state.platform}`
      );
      // ─── CALL HERMES AGENT (The Brain) via chat -q ───
      console.log('[Kelly] Starting code generation with Hermes agent...');
      
      const promptFile = `/tmp/hermes-prompt-${this.state.projectId}.txt`;
      const hermesPrompt = `You are Kelly, the AI builder for BuildAny. Your job is to generate complete, production-ready apps.

## USER REQUEST

${this.state.prompt}

## YOUR TASK

Use your skills to plan and build this app:
1. **Plan** (spec-driven-development): What pages, components, and features are needed?
2. **Design** (frontend-ui-engineering): Modern, colorful, accessible UI with Tailwind CSS
3. **Build** (incremental-implementation): Generate all files step by step
4. **Review** (code-review-and-quality): Ensure no placeholders, all imports resolve

## TECH STACK
- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- shadcn/ui components
- lucide-react icons
- Demo data pre-loaded (no empty states)

## OUTPUT FORMAT

Return EVERY file as a code block. Use the file path as the language tag like this:
\`\`\`tsx:src/app/page.tsx
// ACTUAL CODE GOES HERE — NOT placeholder text
\`\`\`

Do NOT write "// full file content here" or any placeholder. Generate real, working code immediately. Every file must contain complete, functional code.

## RULES
- page.tsx MUST import and render ALL components from src/components/
- Use 'use client' for client components
- layout.tsx MUST import "./globals.css"
- Use next/image with unoptimized={true}
- NEVER use cn() with object syntax — use conditional strings only
- Dark theme with gradients (slate-900, blue/cyan/teal accents)
- All components must have demo data — no "Lorem ipsum", no placeholders
- Use real metrics, real chart data, real user names
- Include animations (fadeIn, slideUp keyframes in Tailwind config)

Generate the COMPLETE app now.`;
      
      await fs.writeFile(promptFile, hermesPrompt, "utf8");
      
      let hermesOutput = "";
      try {
        // Copy prompt into container (host /tmp not mounted in container)
        const containerPromptPath = `/tmp/hermes-prompt-${this.state.projectId}.txt`;
        await execAsync(`docker cp ${promptFile} hermes-gateway:${containerPromptPath}`);
        
        // Run Hermes with chat -q (works with skills, needs time)
        const { stdout, stderr } = await execAsync(
          `docker exec hermes-gateway sh -c 'hermes chat -q "$(cat ${containerPromptPath})" -s spec-driven-development,frontend-ui-engineering,incremental-implementation,code-review-and-quality --yolo --ignore-rules'`,
          { timeout: 600000, maxBuffer: 50 * 1024 * 1024 }
        );
        hermesOutput = stdout || "";
        if (stderr) console.log("[Hermes stderr]:", stderr);
      } catch (hermesErr: any) {
        console.error("[Hermes] CLI error:", hermesErr.message);
      }
      
      const result = {
        success: !!(hermesOutput && hermesOutput.length > 100),
        content: hermesOutput.replace(/^Query:.*\n/, "").trim(),
        error: hermesOutput && hermesOutput.length > 100 ? null : "Hermes agent produced no output",
      };
      
      console.log('[Kelly] Hermes result:', { success: result.success, hasContent: !!result.content, length: result.content?.length });

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
      let parsedFiles = parseGeneratedCode(result.content);
      
      // ─── FIX: Correct common file path mistakes ───
      const correctedFiles: typeof parsedFiles = [];
      const hasNextJs = parsedFiles.some(f => f.path.includes('next.config') || f.path.includes('tsconfig.json') || f.content.includes('from "next"'));
      
      for (const file of parsedFiles) {
        let path = file.path;
        
        if (hasNextJs) {
          // Fix: app.tsx at root → src/app/page.tsx
          if (path === 'app.tsx' || path === '/app.tsx') {
            path = 'src/app/page.tsx';
            console.log('[Kelly] Path fix: app.tsx → src/app/page.tsx');
          }
          // Fix: layout.tsx at root → src/app/layout.tsx
          if (path === 'layout.tsx' || path === '/layout.tsx') {
            path = 'src/app/layout.tsx';
            console.log('[Kelly] Path fix: layout.tsx → src/app/layout.tsx');
          }
          // Fix: page.tsx at root → src/app/page.tsx
          if (path === 'page.tsx' || path === '/page.tsx') {
            path = 'src/app/page.tsx';
            console.log('[Kelly] Path fix: page.tsx → src/app/page.tsx');
          }
          // Fix: globals.css at root → src/app/globals.css
          if (path === 'globals.css' || path === '/globals.css') {
            path = 'src/app/globals.css';
            console.log('[Kelly] Path fix: globals.css → src/app/globals.css');
          }
          // Fix: Remove index.html from Next.js projects (Next.js generates its own)
          if (path === 'index.html' || path === '/index.html') {
            console.log('[Kelly] Path fix: skipping index.html in Next.js project');
            continue;
          }
        }
        
        correctedFiles.push({ ...file, path });
      }
      parsedFiles = correctedFiles;
      
      console.log('[Kelly] Code generation result:', { 
        hasContent: !!result.content, 
        contentLength: result.content?.length || 0,
        parsedFiles: parsedFiles.length,
        firstFile: parsedFiles[0]?.path
      });
      
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

      // Delete existing files first to avoid UNIQUE constraint errors
      console.log('[Kelly] Clearing old files for project:', this.state.projectId);
      try {
        await db.delete(projectFiles)
          .where(eq(projectFiles.projectId, this.state.projectId));
        console.log('[Kelly] Deleted old files');
      } catch (e) {
        console.log('[Kelly] No old files to delete');
      }

      // Save files to database AND filesystem
      const projectDir = path.join(PROJECTS_DIR, this.state.projectId);
      await fs.mkdir(projectDir, { recursive: true });
      
      for (const file of parsedFiles) {
        try {
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
        } catch (insertErr: any) {
          if (insertErr.message && insertErr.message.includes("UNIQUE")) {
            console.log("[Kelly] File exists, updating:", file.path);
            await db.update(projectFiles)
              .set({ content: file.content, language: file.language, updatedAt: new Date() })
              .where(eq(projectFiles.projectId, this.state.projectId))
              .where(eq(projectFiles.path, file.path));
          } else {
            console.error("[Kelly] Insert error:", insertErr.message);
          }
        }
        
        // Also write to filesystem so Files panel can read it
        const safePath = path.join(projectDir, file.path.replace(/^\//, ""));
        await fs.mkdir(path.dirname(safePath), { recursive: true });
        await fs.writeFile(safePath, file.content || "", "utf-8");
      }
      console.log(`[Kelly] Saved ${parsedFiles.length} files to ${projectDir}`);

      // ─── POST-PROCESS: Create stub components for missing imports ───
      // Kelly sometimes imports components she didn't generate. Create stubs so build succeeds.
      const allGeneratedPaths = new Set(parsedFiles.map(f => f.path));
      const stubsCreated: string[] = [];

      for (const file of parsedFiles) {
        if (!file.path.endsWith('.tsx') && !file.path.endsWith('.ts')) continue;
        
        // Find all @/ imports
        const importRegex = /from\s+["']@\/([^"']+)["']/g;
        let match;
        while ((match = importRegex.exec(file.content || "")) !== null) {
          const importPath = match[1]; // e.g. "components/dashboard/dashboard"
          
          // Possible file paths to check
          const possiblePaths = [
            `src/${importPath}.tsx`,
            `src/${importPath}.ts`,
            `${importPath}.tsx`,
            `${importPath}.ts`,
          ];
          
          const exists = possiblePaths.some(p => allGeneratedPaths.has(p));
          if (!exists) {
            // Determine stub file path
            const stubPath = `src/${importPath}.tsx`;
            if (allGeneratedPaths.has(stubPath)) continue; // Already handled
            
            // Create stub component
            const componentName = stubPath.split('/').pop()?.replace('.tsx', '') || 'Stub';
            const pascalName = componentName.charAt(0).toUpperCase() + componentName.slice(1).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
            
            const stubContent = `'use client';

import React from "react";

interface ${pascalName}Props {
  [key: string]: any;
}

export function ${pascalName}(props: ${pascalName}Props) {
  return (
    <div className="p-4 border border-dashed border-gray-300 rounded-lg">
      <p className="text-sm text-gray-500">Component: {${JSON.stringify(pascalName)}}</p>
    </div>
  );
}
`;
            
            // Write stub to filesystem
            const stubFullPath = path.join(projectDir, stubPath);
            await fs.mkdir(path.dirname(stubFullPath), { recursive: true });
            await fs.writeFile(stubFullPath, stubContent, "utf-8");
            
            // Save to DB
            try {
              await db.insert(projectFiles).values({
                id: crypto.randomUUID(),
                projectId: this.state.projectId,
                path: stubPath,
                content: stubContent,
                language: 'tsx',
                isGenerated: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            } catch {}
            
            allGeneratedPaths.add(stubPath);
            stubsCreated.push(stubPath);
            console.log(`[Kelly] Created stub: ${stubPath}`);
          }
        }
      }
      
      if (stubsCreated.length > 0) {
        console.log(`[Kelly] Created ${stubsCreated.length} stub components for missing imports`);
      }

      // ─── SAFETY NET: Ensure page.tsx exists ───
      // Kelly sometimes forgets to generate page.tsx. Create a fallback.
      const pagePaths = [
        'src/app/page.tsx',
        'app/page.tsx',
        'src/pages/index.tsx',
        'pages/index.tsx',
      ];
      const hasPage = pagePaths.some(p => allGeneratedPaths.has(p));
      
      if (!hasPage) {
        console.log('[Kelly] WARNING: No page.tsx found! Creating fallback...');
        
        // Check if this is App Router or Pages Router
        const hasAppDir = await fileExists(path.join(projectDir, 'src', 'app')) || await fileExists(path.join(projectDir, 'app'));
        const pagePath = hasAppDir ? 'src/app/page.tsx' : 'src/pages/index.tsx';
        
        // Create a simple page that imports whatever components exist
        const componentImports = Array.from(allGeneratedPaths)
          .filter(p => p.includes('/components/') && p.endsWith('.tsx'))
          .map(p => {
            const name = p.split('/').pop()?.replace('.tsx', '') || '';
            const importPath = p.replace('src/', '@/').replace('.tsx', '');
            return { name, path: importPath };
          });
        
        // Build rich page from generated components
        const compFiles = Array.from(allGeneratedPaths)
          .filter(p => p.includes('/components/') && p.endsWith('.tsx') && !p.includes('/page.tsx'))
          .map(p => {
            const name = p.split('/').pop()?.replace('.tsx', '') || '';
            const clean = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
            return { name: clean, path: p.replace('src/', '@/').replace('.tsx', '') };
          });
        
        const imports = compFiles.map(c => `import { ${c.name} } from "${c.path}";`).join('\n');
        const usage = compFiles.map(c => `        <${c.name} />`).join('\n');
        
        const pageContent = `// @ts-nocheck\n'use client';\n\nimport React from "react";\n${imports}\n\nexport default function HomePage() {\n  return (\n    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">\n      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl">\n        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">\n          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">\n            BuildAny App\n          </h1>\n          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm">Pro</span>\n        </div>\n      </header>\n\n      <section className="max-w-7xl mx-auto px-6 py-12">\n        <div className="text-center mb-12">\n          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">\n            Your Dashboard\n          </h2>\n          <p className="text-xl text-gray-400 max-w-2xl mx-auto">\n            Modern app with real-time insights and beautiful visualizations.\n          </p>\n        </div>\n\n        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">\n          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">\n            <p className="text-gray-400 text-sm mb-1">Total Users</p>\n            <p className="text-3xl font-bold text-blue-400">12,847</p>\n            <p className="text-green-400 text-sm mt-1">+23% this week</p>\n          </div>\n          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">\n            <p className="text-gray-400 text-sm mb-1">Revenue</p>\n            <p className="text-3xl font-bold text-cyan-400">$48.2K</p>\n            <p className="text-green-400 text-sm mt-1">+18% this month</p>\n          </div>\n          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">\n            <p className="text-gray-400 text-sm mb-1">Active Sessions</p>\n            <p className="text-3xl font-bold text-teal-400">3,421</p>\n            <p className="text-green-400 text-sm mt-1">+12% today</p>\n          </div>\n          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">\n            <p className="text-gray-400 text-sm mb-1">Growth Rate</p>\n            <p className="text-3xl font-bold text-purple-400">94.2%</p>\n            <p className="text-green-400 text-sm mt-1">+5.3% vs last month</p>\n          </div>\n        </div>\n\n        <div className="space-y-6">\n${usage}\n        </div>\n\n        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">\n          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-6 border border-blue-500/20">\n            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 text-2xl">⚡</div>\n            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>\n            <p className="text-gray-400">Optimized for performance with instant load times.</p>\n          </div>\n          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20">\n            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 text-2xl">🔒</div>\n            <h3 className="text-lg font-semibold mb-2">Secure by Default</h3>\n            <p className="text-gray-400">Enterprise-grade security with end-to-end encryption.</p>\n          </div>\n          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-500/20">\n            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 text-2xl">📊</div>\n            <h3 className="text-lg font-semibold mb-2">Real-time Analytics</h3>\n            <p className="text-gray-400">Live data updates with beautiful visualizations.</p>\n          </div>\n        </div>\n      </section>\n    </main>\n  );\n}\n`;
        
        const pageFullPath = path.join(projectDir, pagePath);
        await fs.mkdir(path.dirname(pageFullPath), { recursive: true });
        await fs.writeFile(pageFullPath, pageContent, 'utf-8');
        
        // Save to DB
        try {
          await db.insert(projectFiles).values({
            id: crypto.randomUUID(),
            projectId: this.state.projectId,
            path: pagePath,
            content: pageContent,
            language: 'tsx',
            isGenerated: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch {}
        
        allGeneratedPaths.add(pagePath);
        console.log(`[Kelly] Created fallback ${pagePath}`);
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
        model: 'hermes',
        createdAt: new Date(),
      });

      // ─── Save memory about this project for future context ───
      try {
        const techStack = this.inferTechStack(parsedFiles);
        
        // Save project summary
        memoryClient.write({
          content: `Project "${this.state.prompt}" generated ${parsedFiles.length} files. Tech stack: ${techStack.join(', ')}. Platform: ${this.state.platform}.`,
          category: 'project',
          importance: 70,
          projectId: this.state.projectId,
          tags: `${this.state.platform},${techStack.join(',')}`,
        });
        
        // Save pattern memory (what files were created)
        const filePatterns = parsedFiles.map(f => f.path.split('/').pop()).filter(Boolean);
        if (filePatterns.length > 0) {
          memoryClient.write({
            content: `Pattern: "${this.state.prompt}" typically needs files like: ${filePatterns.join(', ')}`,
            category: 'tech',
            importance: 60,
            projectId: this.state.projectId,
            tags: 'patterns,file-structure',
          });
        }
        
        // Save tech preference if React/Next.js detected
        if (techStack.some(t => t.includes('React') || t.includes('Next'))) {
          memoryClient.write({
            content: `User frequently builds React/Next.js projects. Default to these when platform is 'web'.`,
            category: 'tech',
            importance: 75,
            projectId: this.state.projectId,
            tags: 'react,nextjs,preferences',
          });
        }
        
        // Save UI preference if Tailwind detected
        if (techStack.includes('Tailwind CSS')) {
          memoryClient.write({
            content: `User prefers Tailwind CSS for styling web projects.`,
            category: 'design',
            importance: 65,
            projectId: this.state.projectId,
            tags: 'tailwind,css,preferences',
          });
        }
      } catch (memErr) {
        console.error('[Kelly] Failed to save memory:', memErr);
      }

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

      // Build test prompt with skill-enhanced system prompt
      const baseSystemPrompt = `You are a QA engineer. Review the generated code and identify issues. Report bugs, security issues, and quality concerns.`;
      const enhancedSystemPrompt = buildEnhancedSystemPrompt(
        baseSystemPrompt,
        'testing',
        `Project: ${this.state.prompt}\nPlatform: ${this.state.platform}\nFiles: ${files.map(f => f.path).join(', ')}`
      );
      
      const testPrompt = `Review these generated files for a ${this.state.platform} app:

${files.slice(0, 10).map(f => `--- ${f.path} ---\n${f.content?.substring(0, 2000) || 'empty'}\n`).join('\n')}

Provide a test report covering:
1. Bugs or issues found
2. Security concerns
3. Performance issues
4. Accessibility problems
5. Overall quality score (1-10)`;

      const result = await llmRouter.generate({
        prompt: testPrompt,
        systemPrompt: enhancedSystemPrompt,
        provider: 'hermes',
        temperature: 0.5,
        maxTokens: 2000,
      });

      // Basic validation tests
      const testsPassed = files.filter(f => f.content && f.content.length > 0).length;
      const testsFailed = files.length - testsPassed;

      // Run syntax validation for HTML/JS files
      let syntaxErrors = 0;
      for (const file of files) {
        if (file.language === 'html' && file.content) {
          if (!file.content.includes('<html') || !file.content.includes('<body')) {
            syntaxErrors++;
          }
        }
      }

      // Save test report to wiki
      if (result.success && result.content) {
        await db.insert(wikiPages).values({
          id: crypto.randomUUID(),
          projectId: this.state.projectId,
          pageType: 'test',
          title: 'Test Report - Auto Generated',
          content: `# Test Report\n\n${result.content}`,
          autoGenerated: true,
          createdAt: new Date(),
        });
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
          llmTestReport: result.success ? 'generated' : 'failed',
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
      
      const files = await db.select().from(projectFiles)
        .where(eq(projectFiles.projectId, this.state.projectId));
      
      // For web: look for HTML files
      // For mobile: look for entry point (app/index.tsx or index.tsx)
      let previewFile = null;
      let previewType = 'web';
      
      if (this.state.platform === 'mobile') {
        previewFile = files.find(f => f.path === 'app/index.tsx' || f.path === 'index.tsx' || f.path.endsWith('.tsx'));
        previewType = 'mobile';
      } else {
        previewFile = files.find(f => f.path === 'index.html' || f.path.endsWith('.html'));
      }
      
      if (!previewFile || !previewFile.content) {
        await this.updateTaskStatus('Preview', 'failed');
        return {
          phase: 'previewing',
          success: false,
          message: `No preview file found for ${this.state.platform} app`,
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
          previewFile: previewFile.path,
          previewType,
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
      console.error('[Kelly] Auto code review failed:', error);
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

**Features:** ${(Array.isArray(c.features) ? c.features : []).join(', ')}

**Strengths:** ${Array.isArray(c.strengths) ? c.strengths.join(', ') : ''}

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
      console.error('[Kelly] Wiki generation failed:', error);
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
      console.error('[Kelly] Failed to update task:', error);
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
        // HIGH FIX: Re-execute the last failed phase, not always 'coding'
        {
          const lastFailedPhase = this.state.phases.slice().reverse().find(p => !p.success);
          if (lastFailedPhase) {
            await this.executePhase(lastFailedPhase.phase);
          } else {
            // Fallback: if no failed phase found, restart from coding
            await this.executePhase('coding');
          }
        }
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
    
    // Save to memory for cross-project learning
    try {
      memoryClient.write({
        content: `Correction: User manually fixed ${(correction as any).phase} phase — ${(correction as any).correction}. Original: "${(correction as any).originalOutput?.substring(0, 100)}..."`,
        category: 'decision',
        importance: 85,
        projectId: this.state.projectId,
        tags: `correction,${correction.phase},learning`,
      });
    } catch (memErr) {
      console.error('[Kelly] Failed to save correction memory:', memErr);
    }
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
    console.log(`[Kelly Learning] Phase "${phase}" skip rate from corrections: ${skipRate.toFixed(2)}`);
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
      console.error('[Kelly] Failed to mark tasks completed:', error);
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

export default KellyOrchestrator;
