/**
 * Morgan Training Module
 * 
 * Sets up OpenManus with task templates, security rules, and
 * integration points for the BuildAny orchestration system.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, writeFileSync, mkdirSync } from "fs";

const execAsync = promisify(exec);

const OPENMANUS_DIR = "/root/OpenManus";
const OPENMANUS_CONFIG = "/root/OpenManus/config/config.toml";

interface MorganTask {
  name: string;
  description: string;
  prompt: string;
  expectedOutput: string;
}

/**
 * Standard Morgan tasks for BuildAny
 */
export const MORGAN_TASKS: MorganTask[] = [
  {
    name: "security-audit",
    description: "Audit codebase for security vulnerabilities",
    prompt: `Perform a comprehensive security audit of the BuildAny codebase. Check for:
1. API routes without authentication
2. SQL injection vulnerabilities
3. XSS risks
4. Insecure dependencies
5. Hardcoded secrets
6. CORS misconfigurations

Provide a detailed report with severity levels and fix recommendations.`,
    expectedOutput: "Security report with critical/medium/low issues and fixes",
  },
  {
    name: "dependency-audit",
    description: "Check for outdated or vulnerable dependencies",
    prompt: `Audit all dependencies in package.json for:
1. Known vulnerabilities (CVEs)
2. Outdated packages
3. Unnecessary bloat
4. Duplicate functionality

Use npm audit and suggest minimal replacements following Ponytail rules.`,
    expectedOutput: "Dependency report with update/patch/remove recommendations",
  },
  {
    name: "code-cleanup",
    description: "Remove dead code, unused imports, console logs",
    prompt: `Clean up the codebase:
1. Remove unused imports
2. Delete dead code (functions never called)
3. Remove console.log statements
4. Standardize formatting
5. Fix obvious anti-patterns

Be careful not to break functionality. Create a summary of changes.`,
    expectedOutput: "Cleanup summary with files modified and lines removed",
  },
  {
    name: "test-generation",
    description: "Generate unit tests for critical functions",
    prompt: `Generate comprehensive unit tests for:
1. API route handlers
2. Database operations
3. Utility functions
4. Authentication flows

Use Jest or Vitest. Focus on edge cases and error handling.`,
    expectedOutput: "Test files with >80% coverage",
  },
  {
    name: "performance-audit",
    description: "Find performance bottlenecks",
    prompt: `Audit for performance issues:
1. N+1 database queries
2. Unnecessary re-renders in React components
3. Large bundle sizes
4. Slow API endpoints
5. Memory leaks

Provide specific fixes with expected performance gains.`,
    expectedOutput: "Performance report with before/after metrics",
  },
];

/**
 * Check if OpenManus is installed and configured
 */
export async function checkOpenManus(): Promise<{
  installed: boolean;
  version?: string;
  configExists: boolean;
  tasksAvailable: string[];
}> {
  const result = {
    installed: false,
    configExists: false,
    tasksAvailable: [] as string[],
  };

  // Check if directory exists
  if (!existsSync(OPENMANUS_DIR)) {
    return result;
  }

  result.installed = true;

  // Check config
  if (existsSync(OPENMANUS_CONFIG)) {
    result.configExists = true;
  }

  // Check available tasks
  try {
    const { stdout } = await execAsync("ls /root/OpenManus/tasks/ 2>/dev/null || echo 'NO_TASKS_DIR'", {
      timeout: 5000,
    });
    if (stdout.trim() !== "NO_TASKS_DIR") {
      result.tasksAvailable = stdout.trim().split("\n").filter(Boolean);
    }
  } catch {
    // Ignore errors
  }

  return result;
}

/**
 * Initialize Morgan with BuildAny-specific configuration
 */
export async function initializeMorgan(): Promise<{
  success: boolean;
  message: string;
}> {
  // Check if OpenManus is installed
  const status = await checkOpenManus();
  
  if (!status.installed) {
    return {
      success: false,
      message: "OpenManus not installed. Run: cd /root && git clone https://github.com/mannaandpoem/OpenManus.git",
    };
  }

  // Create tasks directory if needed
  const tasksDir = `${OPENMANUS_DIR}/tasks`;
  if (!existsSync(tasksDir)) {
    mkdirSync(tasksDir, { recursive: true });
  }

  // Write task templates
  for (const task of MORGAN_TASKS) {
    const taskFile = `${tasksDir}/${task.name}.md`;
    const content = `# ${task.name}
# ${task.description}

${task.prompt}

## Expected Output
${task.expectedOutput}
`;
    writeFileSync(taskFile, content, "utf-8");
  }

  // Create Morgan's system prompt
  const systemPrompt = `You are Morgan, the AI Executor for BuildAny.

## Your Role
- Execute security audits, bulk fixes, refactoring, and automation
- Follow Ponytail minimalist rules (no over-engineering)
- Report clearly what you changed and why

## BuildAny Context
- Stack: Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui
- Database: SQLite with Drizzle ORM
- Auth: Clerk
- AI: DeepSeek via Hermes gateway

## Rules
1. Always validate inputs before processing
2. Never delete without confirming
3. Create backups before large changes
4. Report exact files modified and line counts
5. Prefer stdlib solutions over new dependencies
`;

  writeFileSync(`${OPENMANUS_DIR}/MORGAN_SYSTEM.md`, systemPrompt, "utf-8");

  return {
    success: true,
    message: `Morgan initialized with ${MORGAN_TASKS.length} task templates`,
  };
}

/**
 * Run a Morgan task
 */
export async function runMorganTask(
  taskName: string,
  context?: string
): Promise<{
  success: boolean;
  output: string;
  errors?: string;
}> {
  const status = await checkOpenManus();
  
  if (!status.installed) {
    return {
      success: false,
      output: "",
      errors: "OpenManus not installed",
    };
  }

  const task = MORGAN_TASKS.find(t => t.name === taskName);
  if (!task) {
    return {
      success: false,
      output: "",
      errors: `Unknown task: ${taskName}. Available: ${MORGAN_TASKS.map(t => t.name).join(", ")}`,
    };
  }

  const taskFile = `${OPENMANUS_DIR}/tasks/${task.name}.md`;
  if (!existsSync(taskFile)) {
    await initializeMorgan();
  }

  try {
    const command = context
      ? `cd ${OPENMANUS_DIR} && python3 run_mcp.py --task "${taskFile}" --context "${context}"`
      : `cd ${OPENMANUS_DIR} && python3 run_mcp.py --task "${taskFile}"`;

    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5 minutes
      maxBuffer: 5 * 1024 * 1024,
    });

    return {
      success: true,
      output: stdout,
      errors: stderr || undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || "",
      errors: error.message,
    };
  }
}

/**
 * Get available Morgan tasks
 */
export function getMorganTasks(): MorganTask[] {
  return MORGAN_TASKS;
}
