/**
 * ARD/OKF Skills Registry
 * Exposes all available skills to both Kelly and Morgan via ARD/OKF.
 * This allows both agents to learn and improve with every project.
 */

import fs from "fs/promises";
import path from "path";

// Skill categories from all sources
export interface SkillRegistry {
  // Kelly's Hermes skills (from ~/.hermes/skills/)
  hermesSkills: string[];
  
  // Superpower skills (from addyosmani/superpowers)
  superpowerSkills: string[];
  
  // Ponytail skills (minimalist coding)
  ponytailSkills: string[];
  
  // Morgan's OpenManus tools
  morganTools: string[];
  
  // Combined skill descriptions
  descriptions: Record<string, string>;
}

// Hermes skills directory
const HERMES_SKILLS_DIR = "/root/.hermes/skills";

// Known superpower skills
const SUPERPOWER_SKILLS = [
  "api-and-interface-design",
  "brainstorming",
  "campaign-plan",
  "churn-prevention",
  "code-review-and-quality",
  "debugging-and-error-recovery",
  "documentation-and-adrs",
  "frontend-ui-engineering",
  "git-workflow-and-versioning",
  "incremental-implementation",
  "observability-and-instrumentation",
  "performance-optimization",
  "pricing-strategy",
  "security-and-hardening",
  "shipping-and-launch",
  "spec-driven-development",
  "systematic-debugging",
  "test-driven-development",
];

// Ponytail skills
const PONYTAIL_SKILLS = [
  "ponytail",
  "ponytail-review",
  "ponytail-audit",
  "ponytail-debt",
  "ponytail-gain",
  "ponytail-help",
];

// Morgan's OpenManus tools
const MORGAN_TOOLS = [
  "file_writer",
  "browser_use",
  "search",
  "code_review",
  "security_audit",
  "test_generator",
];

/**
 * Build full skill registry
 */
export async function buildSkillRegistry(): Promise<SkillRegistry> {
  // Read Hermes skills from filesystem
  const hermesSkills = await readHermesSkills();
  
  return {
    hermesSkills,
    superpowerSkills: SUPERPOWER_SKILLS,
    ponytailSkills: PONYTAIL_SKILLS,
    morganTools: MORGAN_TOOLS,
    descriptions: SKILL_DESCRIPTIONS,
  };
}

/**
 * Read Hermes skills from ~/.hermes/skills/
 */
async function readHermesSkills(): Promise<string[]> {
  try {
    const entries = await fs.readdir(HERMES_SKILLS_DIR, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch {
    return []; // Directory might not exist in sandbox
  }
}

/**
 * Build ARD (Architecture Review Document) with skills context
 */
export function buildARD(projectId: string, registry: SkillRegistry): string {
  return `# Architecture Review Document (ARD)
# Project: ${projectId}
# Generated: ${new Date().toISOString()}

## Available Skills & Tools

### Kelly's Skills (Hermes)
${registry.hermesSkills.map(s => `- ${s}`).join("\n") || "- (loading from Hermes)"}

### Superpower Skills
${registry.superpowerSkills.map(s => `- ${s}: ${registry.descriptions[s] || "General skill"}`).join("\n")}

### Ponytail Rules (MUST FOLLOW)
${registry.ponytailSkills.map(s => `- ${s}: ${registry.descriptions[s] || "Minimalist coding"}`).join("\n")}

### Morgan's Tools
${registry.morganTools.map(t => `- ${t}: ${registry.descriptions[t] || "OpenManus tool"}`).join("\n")}

## How to Use Skills
1. Kelly selects the best skill for planning/research
2. Morgan uses tools for execution
3. Both agents reference ARD for context
4. After each project, update OKF with learnings

## Stack
- Next.js 15, React 19, TypeScript
- Tailwind CSS, shadcn/ui
- SQLite + Drizzle ORM
- Clerk auth
- DeepSeek via Hermes gateway
`;
}

/**
 * Build OKF (Open Knowledge Framework) — accumulates learnings
 */
export function buildOKF(
  projectId: string,
  learnings: string[],
  previousOKF?: string
): string {
  const newEntry = `

## Project: ${projectId}
### Learnings
${learnings.map(l => `- ${l}`).join("\n")}
### Timestamp
${new Date().toISOString()}
`;

  return (previousOKF || `# Open Knowledge Framework (OKF)\n# Accumulated learnings from all projects\n`) + newEntry;
}

/**
 * Extract learnings from a completed project
 */
export function extractLearnings(
  projectType: string,
  issues: string[],
  successes: string[]
): string[] {
  return [
    `Project type: ${projectType}`,
    ...issues.map(i => `Issue: ${i}`),
    ...successes.map(s => `Success: ${s}`),
    `Pattern observed: ${projectType} typically needs ${successes.join(", ")}`,
  ];
}

// Skill descriptions
const SKILL_DESCRIPTIONS: Record<string, string> = {
  "api-and-interface-design": "Design clean APIs and interfaces",
  "brainstorming": "Generate creative ideas and solutions",
  "campaign-plan": "Plan marketing and product campaigns",
  "churn-prevention": "Reduce user churn with analytics",
  "code-review-and-quality": "Review code for quality and bugs",
  "debugging-and-error-recovery": "Systematic debugging approach",
  "documentation-and-adrs": "Write docs and architecture decisions",
  "frontend-ui-engineering": "Build polished UI components",
  "git-workflow-and-versioning": "Git best practices",
  "incremental-implementation": "Build features incrementally",
  "observability-and-instrumentation": "Add monitoring and logging",
  "performance-optimization": "Optimize app performance",
  "pricing-strategy": "Design pricing models",
  "security-and-hardening": "Secure the application",
  "shipping-and-launch": "Launch checklist and process",
  "spec-driven-development": "Write specs before coding",
  "systematic-debugging": "Debug with methodology",
  "test-driven-development": "Write tests first",
  "ponytail": "Minimalist coding philosophy",
  "ponytail-review": "Review code for minimalism",
  "ponytail-audit": "Audit codebase for bloat",
  "ponytail-debt": "Track technical debt",
  "ponytail-gain": "Measure simplification wins",
  "ponytail-help": "Get minimalist coding help",
  "file_writer": "Write files to project directory",
  "browser_use": "Automate browser interactions",
  "search": "Search the web for information",
  "code_review": "Review code for quality",
  "security_audit": "Audit for vulnerabilities",
  "test_generator": "Generate unit tests",
};

/**
 * Save ARD and OKF to project knowledge directory
 */
export async function saveKnowledge(
  projectPath: string,
  ard: string,
  okf: string
): Promise<void> {
  const knowledgeDir = path.join(projectPath, "knowledge");
  await fs.mkdir(knowledgeDir, { recursive: true });
  
  await fs.writeFile(path.join(knowledgeDir, "ARD.md"), ard);
  await fs.writeFile(path.join(knowledgeDir, "OKF.md"), okf);
}

/**
 * Load ARD and OKF from project
 */
export async function loadKnowledge(projectPath: string): Promise<{
  ard: string;
  okf: string;
}> {
  const knowledgeDir = path.join(projectPath, "knowledge");
  
  try {
    const ard = await fs.readFile(path.join(knowledgeDir, "ARD.md"), "utf-8");
    const okf = await fs.readFile(path.join(knowledgeDir, "OKF.md"), "utf-8");
    return { ard, okf };
  } catch {
    return { ard: "", okf: "" };
  }
}
