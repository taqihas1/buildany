/**
 * Morgan Code Generator
 * Wires OpenManus (Morgan) as the primary code generator for BuildAny.
 * 
 * Flow:
 * 1. Kelly provides plan + context
 * 2. Morgan receives: plan, ARD, OKF, ponytail rules, project path
 * 3. Morgan generates code using file_writer tool
 * 4. Morgan self-reviews and fixes
 * 5. Returns result to BuildAny
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

// Paths
const OPENMANUS_DIR = "/root/OpenManus";
const OPENMANUS_VENV = `${OPENMANUS_DIR}/.venv/bin/python3`;

// Morgan system prompt with full context
interface MorganContext {
  plan: string[];
  ard: string;        // Architecture Review Document
  okf: string;        // Open Knowledge Framework
  ponytail: string;   // Ponytail rules
  projectPath: string;
  userPrompt: string;
  skills: string[];   // Available skills
}

/**
 * Generate code using Morgan (OpenManus)
 */
export async function generateWithMorgan(
  context: MorganContext
): Promise<{
  success: boolean;
  files: string[];
  review: string;
  errors?: string;
}> {
  // Build Morgan's task prompt
  const taskContent = buildMorganTask(context);
  
  // Write task file for OpenManus
  const taskPath = `${OPENMANUS_DIR}/tasks/buildany-generate.md`;
  await fs.writeFile(taskPath, taskContent);
  
  // Run OpenManus with the task
  const command = `cd ${OPENMANUS_DIR} && ${OPENMANUS_VENV} run_mcp.py --task tasks/buildany-generate.md`;
  
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 300000 }); // 5 min timeout
    
    // Parse results
    const files = await discoverGeneratedFiles(context.projectPath);
    
    return {
      success: true,
      files,
      review: stdout,
      errors: stderr || undefined
    };
  } catch (error: any) {
    return {
      success: false,
      files: [],
      review: "",
      errors: error.message || "Morgan execution failed"
    };
  }
}

/**
 * Build Morgan's task prompt with full context
 */
function buildMorganTask(context: MorganContext): string {
  return `# buildany-generate
# Generate BuildAny project code based on Kelly's plan

## User Request
${context.userPrompt}

## Kelly's Plan
${context.plan.map((step, i) => `${i + 1}. ${step}`).join("\n")}

## Architecture Review Document (ARD)
${context.ard}

## Open Knowledge Framework (OKF)
${context.okf}

## Ponytail Rules (MUST FOLLOW)
${context.ponytail}

## Available Skills
${context.skills.map(s => `- ${s}`).join("\n")}

## Technical Stack
- Next.js 15 with App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components
- SQLite with Drizzle ORM
- Clerk authentication

## Project Path
${context.projectPath}

## Instructions
1. Generate all necessary files using the file_writer tool
2. Follow Kelly's plan step by step
3. Apply Ponytail rules: YAGNI, stdlib-first, one-liner preference
4. After writing files, read them back and self-review
5. Fix any issues found during self-review
6. Generate tests for critical functionality

## Output
Provide a summary of:
- Files created/modified
- Key design decisions
- Any deviations from the plan and why
- Tests generated
`;
}

/**
 * Discover files Morgan generated
 */
async function discoverGeneratedFiles(projectPath: string): Promise<string[]> {
  const files: string[] = [];
  
  async function scan(dir: string, base: string = "") {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const relative = path.join(base, entry.name);
      const full = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !["node_modules", ".next", ".npm-cache", ".cacache", "out", "dist"].includes(entry.name)) {
        await scan(full, relative);
      } else if (entry.isFile()) {
        files.push(relative);
      }
    }
  }
  
  await scan(projectPath);
  return files;
}

/**
 * Quick test if Morgan is available
 */
export async function isMorganAvailable(): Promise<boolean> {
  try {
    await execAsync(`${OPENMANUS_VENV} -c "import app.agent"`, { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}
