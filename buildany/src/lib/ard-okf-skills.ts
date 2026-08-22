import fs from "fs/promises";
import path from "path";
const HERMES_DIR = "/root/.hermes/skills";

const SUPERPOWER = [
  "api-and-interface-design","brainstorming","campaign-plan","churn-prevention",
  "code-review-and-quality","debugging-and-error-recovery","documentation-and-adrs",
  "frontend-ui-engineering","git-workflow-and-versioning","incremental-implementation",
  "observability-and-instrumentation","performance-optimization","pricing-strategy",
  "security-and-hardening","shipping-and-launch","spec-driven-development",
  "systematic-debugging","test-driven-development"
];
const PONYTAIL = ["ponytail","ponytail-review","ponytail-audit","ponytail-debt","ponytail-gain","ponytail-help"];
const TOOLS = ["file_writer","browser_use","search","code_review","security_audit","test_generator"];

export interface SkillRegistry {
  hermesSkills: string[]; superpowerSkills: string[]; ponytailSkills: string[];
  morganTools: string[]; descriptions: Record<string,string>;
}

export async function buildSkillRegistry(): Promise<SkillRegistry> {
  const hermesSkills = await fs.readdir(HERMES_DIR).catch(() => [] as string[]);
  return { hermesSkills, superpowerSkills: SUPERPOWER, ponytailSkills: PONYTAIL, morganTools: TOOLS, descriptions: DESC };
}

export function buildARD(projectId: string, r: SkillRegistry): string {
  return `# ARD: ${projectId}\n## Kelly Skills\n${r.hermesSkills.map(s => `- ${s}`).join("\n") || "- loading"}\n## Superpower Skills\n${r.superpowerSkills.map(s => `- ${s}: ${r.descriptions[s]||"skill"}`).join("\n")}\n## Ponytail Rules\n${r.ponytailSkills.map(s => `- ${s}: ${r.descriptions[s]||"minimalist"}`).join("\n")}\n## Morgan Tools\n${r.morganTools.map(t => `- ${t}: ${r.descriptions[t]||"tool"}`).join("\n")}\n## Stack\nNext.js, React, TypeScript, Tailwind, shadcn/ui, SQLite, Clerk, DeepSeek`;
}

export function buildOKF(projectId: string, learnings: string[], prev?: string): string {
  const entry = `\n## Project: ${projectId}\n### Learnings\n${learnings.map(l => `- ${l}`).join("\n")}\n${new Date().toISOString()}\n`;
  return (prev || `# OKF\n`) + entry;
}

export function extractLearnings(type: string, issues: string[], successes: string[]): string[] {
  return [`Type: ${type}`, ...issues.map(i => `Issue: ${i}`), ...successes.map(s => `Success: ${s}`)];
}

export async function saveKnowledge(projectPath: string, ard: string, okf: string): Promise<void> {
  const k = path.join(projectPath, "knowledge");
  await fs.mkdir(k, { recursive: true });
  await fs.writeFile(path.join(k, "ARD.md"), ard);
  await fs.writeFile(path.join(k, "OKF.md"), okf);
}

export async function loadKnowledge(projectPath: string): Promise<{ard: string; okf: string}> {
  const k = path.join(projectPath, "knowledge");
  try {
    return { ard: await fs.readFile(path.join(k, "ARD.md"), "utf-8"), okf: await fs.readFile(path.join(k, "OKF.md"), "utf-8") };
  } catch { return { ard: "", okf: "" }; }
}

const DESC: Record<string,string> = {
  "api-and-interface-design":"Design clean APIs","brainstorming":"Generate ideas",
  "campaign-plan":"Plan campaigns","churn-prevention":"Reduce churn",
  "code-review-and-quality":"Review code","debugging-and-error-recovery":"Debug systematically",
  "documentation-and-adrs":"Write docs","frontend-ui-engineering":"Build UI",
  "git-workflow-and-versioning":"Git workflows","incremental-implementation":"Build incrementally",
  "observability-and-instrumentation":"Add monitoring","performance-optimization":"Optimize perf",
  "pricing-strategy":"Design pricing","security-and-hardening":"Secure app",
  "shipping-and-launch":"Launch features","spec-driven-development":"Spec first",
  "systematic-debugging":"Debug method","test-driven-development":"Tests first",
  "ponytail":"Minimalist philosophy","ponytail-review":"Review minimalism",
  "ponytail-audit":"Audit bloat","ponytail-debt":"Track debt",
  "ponytail-gain":"Measure wins","ponytail-help":"Minimalist help",
  "file_writer":"Write files","browser_use":"Automate browser",
  "search":"Web search","code_review":"Review code",
  "security_audit":"Audit security","test_generator":"Generate tests"
};
