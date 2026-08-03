import { readFileSync } from "fs";
import { join } from "path";

// Skill paths relative to project root
const SKILL_DIRS = [
  "/root/.openclaw/skills/agent-skills/skills",
  "/root/.openclaw/skills/superpowers/skills",
  "/root/.hermes/skills/agent-skills/skills",
  "/root/.hermes/skills/superpowers/skills",
];

// Skill name → file path cache
const skillPathCache: Map<string, string> = new Map();

// Load all available skill paths on startup
function discoverSkills(): void {
  for (const dir of SKILL_DIRS) {
    try {
      const fs = require("fs");
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = join(dir, entry.name, "SKILL.md");
          try {
            fs.accessSync(skillPath, fs.constants.R_OK);
            skillPathCache.set(entry.name, skillPath);
          } catch {
            // No SKILL.md in this directory
          }
        }
      }
    } catch {
      // Directory doesn't exist or not readable
    }
  }
}

// Initialize on first load
discoverSkills();

export function getSkillPrompt(skillName: string): string | null {
  const path = skillPathCache.get(skillName);
  if (!path) return null;

  try {
    const content = readFileSync(path, "utf-8");
    // Extract the useful parts - skip the front matter and overview
    // Return everything after the first ## heading as the prompt
    const lines = content.split("\n");
    let startIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("## ") || lines[i].startsWith("# ")) {
        startIndex = i;
        break;
      }
    }
    return lines.slice(startIndex).join("\n").slice(0, 8000); // Limit to ~8k chars
  } catch {
    return null;
  }
}

export function getSkillList(): string[] {
  return Array.from(skillPathCache.keys());
}

// Map orchestrator phases to the most relevant skills
export const PHASE_SKILL_MAP: Record<string, string[]> = {
  analyzing: ["spec-driven-development", "context-engineering"],
  design: ["spec-driven-development", "documentation-and-adrs", "api-and-interface-design"],
  coding: ["buildany-code-generation", "incremental-implementation", "frontend-ui-engineering"],
  testing: ["test-driven-development", "systematic-debugging", "browser-testing-with-devtools"],
  reviewing: ["code-review-and-quality", "receiving-code-review"],
  previewing: ["browser-testing-with-devtools"],
};

export function buildEnhancedSystemPrompt(
  baseSystemPrompt: string,
  phase: string,
  skillContext?: string
): string {
  const skillNames = PHASE_SKILL_MAP[phase] || [];
  const skillPrompts: string[] = [];

  for (const skillName of skillNames) {
    const prompt = getSkillPrompt(skillName);
    if (prompt) {
      skillPrompts.push(`\n--- SKILL: ${skillName} ---\n${prompt}\n--- END SKILL ---\n`);
    }
  }

  const combined = [
    "=== CORE SYSTEM PROMPT ===",
    baseSystemPrompt,
    "",
    "=== SKILL INSTRUCTIONS ===",
    "You MUST follow the skill instructions below for this phase. They provide proven patterns and workflows that improve output quality.",
    ...skillPrompts,
    skillContext ? `\n=== ADDITIONAL CONTEXT ===\n${skillContext}` : "",
    "\n=== END INSTRUCTIONS ===",
    "Combine the core system prompt with the skill instructions above. Follow the skill workflows precisely. Generate structured, complete output.",
  ].join("\n");

  return combined;
}

// Quick test: export the discovered skills for debugging
export function getAvailableSkillsDebug(): string {
  return `Available skills (${skillPathCache.size}): ${Array.from(skillPathCache.keys()).join(", ")}`;
}
