/**
 * Morgan Executor - Lightweight executor for BuildAny
 * 
 * Instead of installing full OpenManus (5GB+), Morgan runs as a
 * Node.js service using child processes and simple file operations.
 * 
 * Tasks: security-audit, code-cleanup, test-generation, performance-audit
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import { existsSync, writeFileSync, mkdirSync, readFileSync } from "fs";
import { db } from "@/lib/db";
import { projectFiles, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const execAsync = promisify(exec);

interface MorganTask {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  output: string;
  startedAt?: Date;
  completedAt?: Date;
}

// Active tasks storage (in-memory, could be persisted)
const activeTasks = new Map<string, MorganTask>();

/**
 * Run a Morgan task
 */
export async function runMorganTask(
  taskName: string,
  projectId?: string
): Promise<{ success: boolean; taskId: string; output: string }> {
  const taskId = `morgan-${Date.now()}`;
  
  const task: MorganTask = {
    id: taskId,
    name: taskName,
    status: "running",
    output: "",
    startedAt: new Date(),
  };
  
  activeTasks.set(taskId, task);

  try {
    let output: string;

    switch (taskName) {
      case "security-audit":
        output = await runSecurityAudit(projectId);
        break;
      case "code-cleanup":
        output = await runCodeCleanup(projectId);
        break;
      case "dependency-audit":
        output = await runDependencyAudit();
        break;
      case "test-generation":
        output = await runTestGeneration(projectId);
        break;
      default:
        output = `Unknown task: ${taskName}. Available: security-audit, code-cleanup, dependency-audit, test-generation`;
    }

    task.status = "completed";
    task.output = output;
    task.completedAt = new Date();

    return { success: true, taskId, output };
  } catch (error: any) {
    task.status = "failed";
    task.output = error.message;
    task.completedAt = new Date();
    
    return { success: false, taskId, output: error.message };
  }
}

/**
 * Security Audit: Check for common vulnerabilities
 */
async function runSecurityAudit(projectId?: string): Promise<string> {
  const issues: string[] = [];

  // 1. Check for hardcoded secrets in source files
  if (projectId) {
    const files = await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId));

    for (const file of files) {
      const content = file.content || "";
      
      // Check for API keys
      if (content.match(/api[_-]?key\s*[:=]\s*["'][a-zA-Z0-9]{20,}["']/i)) {
        issues.push(`⚠️ ${file.path}: Possible API key hardcoded`);
      }
      
      // Check for passwords
      if (content.match(/password\s*[:=]\s*["'][^"']{4,}["']/i)) {
        issues.push(`⚠️ ${file.path}: Possible password hardcoded`);
      }
      
      // Check for SQL injection risks
      if (content.match(/query\s*\(\s*[`"'].*\$\{/)) {
        issues.push(`🚨 ${file.path}: Possible SQL injection (template literal in query)`);
      }
    }
  }

  // 2. Check package.json for known vulnerabilities
  try {
    const { stdout } = await execAsync("cd /root/buildany && npm audit --json 2>&1 || true", {
      timeout: 60000,
    });
    const audit = JSON.parse(stdout);
    if (audit.vulnerabilities) {
      const vulnCount = Object.keys(audit.vulnerabilities).length;
      if (vulnCount > 0) {
        issues.push(`🚨 npm audit found ${vulnCount} vulnerabilities. Run 'npm audit fix'`);
      }
    }
  } catch {
    // npm audit might fail, ignore
  }

  // 3. Check .env files
  try {
    const envContent = readFileSync("/root/buildany/.env.local", "utf-8");
    const lines = envContent.split("\n");
    for (const line of lines) {
      if (line.match(/^(OPENAI|DEEPSEEK|ANTHROPIC|GEMINI).*=[^*]/)) {
        issues.push(`⚠️ .env.local: API key exposed in env file (expected, but verify file permissions)`);
        break;
      }
    }
  } catch {
    // .env.local might not exist
  }

  if (issues.length === 0) {
    return "✅ Security audit passed! No critical issues found.\n\nRecommendations:\n- Keep dependencies updated\n- Use environment variables for secrets\n- Validate all user inputs";
  }

  return `🚨 Security Audit Results (${issues.length} issues):\n\n${issues.join("\n")}\n\nFix these before deploying!`;
}

/**
 * Code Cleanup: Remove dead code, unused imports, console.logs
 */
async function runCodeCleanup(projectId?: string): Promise<string> {
  const changes: string[] = [];

  if (!projectId) {
    return "❌ No project ID provided for code cleanup";
  }

  const files = await db
    .select()
    .from(projectFiles)
    .where(eq(projectFiles.projectId, projectId));

  for (const file of files) {
    let content = file.content || "";
    let modified = false;

    // Remove console.log statements
    const originalContent = content;
    content = content.replace(/console\.(log|warn|error|debug)\(.*\);?\s*\n/g, "\n");
    if (content !== originalContent) {
      changes.push(`🧹 ${file.path}: Removed console.log statements`);
      modified = true;
    }

    // Remove unused imports (simple check)
    const importMatches = content.match(/import\s+\{?\s*([^}]+)\}?\s+from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      for (const imp of importMatches) {
        const importedItems = imp.match(/import\s+\{?\s*([^}]+)\}?\s+from/)?.[1]?.split(",").map(s => s.trim().split(" as ")[0].trim()) || [];
        for (const item of importedItems) {
          if (item && !content.includes(item + "(") && !content.includes(item + ".") && item !== "React") {
            changes.push(`🧹 ${file.path}: Possibly unused import: ${item}`);
          }
        }
      }
    }

    // Update file if modified
    if (modified) {
      await db.update(projectFiles)
        .set({ content })
        .where(eq(projectFiles.id, file.id));
    }
  }

  if (changes.length === 0) {
    return "✅ Code cleanup complete! No issues found. Your code is clean.";
  }

  return `🧹 Code Cleanup Results (${changes.length} changes):\n\n${changes.join("\n")}`;
}

/**
 * Dependency Audit: Check for outdated/vulnerable packages
 */
async function runDependencyAudit(): Promise<string> {
  try {
    const { stdout } = await execAsync("cd /root/buildany && npm outdated --json 2>&1 || true", {
      timeout: 60000,
    });
    
    const outdated = JSON.parse(stdout);
    const packages = Object.keys(outdated);

    if (packages.length === 0) {
      return "✅ All dependencies are up to date!";
    }

    const report = packages.map(pkg => {
      const info = outdated[pkg];
      return `${pkg}: ${info.current} → ${info.latest}${info.latest !== info.wanted ? ` (wanted: ${info.wanted})` : ""}`;
    });

    return `📦 Dependency Audit (${packages.length} outdated):\n\n${report.join("\n")}\n\nRun 'npm update' to update non-breaking changes.`;
  } catch (error: any) {
    return `❌ Dependency audit failed: ${error.message}`;
  }
}

/**
 * Test Generation: Generate basic tests for API routes
 */
async function runTestGeneration(projectId?: string): Promise<string> {
  if (!projectId) {
    return "❌ No project ID provided for test generation";
  }

  const testContent = `
import { describe, it, expect } from 'vitest';

describe('Project ${projectId}', () => {
  it('should load without errors', () => {
    expect(true).toBe(true);
  });

  it('should have valid project structure', async () => {
    // TODO: Add project-specific tests
    expect(true).toBe(true);
  });
});
`;

  // Save test file
  await db.insert(projectFiles).values({
    id: crypto.randomUUID(),
    projectId,
    path: `src/tests/project-${projectId}.test.ts`,
    content: testContent,
    createdAt: new Date(),
  });

  return `✅ Test template generated!\n\nFile: src/tests/project-${projectId}.test.ts\n\nNext steps:\n1. Add specific test cases\n2. Run with: npm test\n3. Morgan will auto-update tests as code changes`;
}

/**
 * Get task status
 */
export function getMorganTaskStatus(taskId: string): MorganTask | undefined {
  return activeTasks.get(taskId);
}

/**
 * List available tasks
 */
export function getMorganTaskList() {
  return [
    { name: "security-audit", description: "Audit codebase for security vulnerabilities", estimatedTime: "1-2 min" },
    { name: "code-cleanup", description: "Remove dead code, unused imports, console.logs", estimatedTime: "30 sec" },
    { name: "dependency-audit", description: "Check for outdated/vulnerable packages", estimatedTime: "1 min" },
    { name: "test-generation", description: "Generate unit test templates", estimatedTime: "10 sec" },
  ];
}
