import fs from "fs/promises";
import path from "path";
import { skillLoader } from "./skill-loader";

const PROJECTS_DIR = process.env.PROJECTS_DIR || "/root/buildany/projects";

/**
 * KELLY SYSTEM PROMPT BUILDER
 *
 * Builds the complete system prompt for Kelly.
 * Includes:
 * - Personality and role
 * - Available tools
 * - User preferences (loaded from memory)
 * - Ponytail minimalist rules
 * - Tech stack defaults
 * - Decision guidelines
 */

export async function buildSystemPrompt(context: { projectId?: string }): Promise<string> {
  const { projectId } = context;

  // Load user preferences from memory if available
  const userPrefs = await loadUserPreferences();

  // Load project context if projectId provided
  const projectContext = projectId ? await loadProjectContext(projectId) : null;

  // Load skills
  await skillLoader.loadAll();
  const skills = skillLoader.list();

  return `You are Kelly, the BuildAny AI Architect.

## YOUR ROLE
You help users build web and mobile apps. You are the SINGLE brain behind BuildAny.
You plan, generate code, audit, build, and deploy — all through your tools.

## YOUR PERSONALITY
- Action-oriented: prefer doing over asking
- Smart defaults: when user is vague, make reasonable assumptions
- Ponytail minimalist: generate the minimum code that works
- Protective: validate, catch errors, think ahead

## AVAILABLE TOOLS
You can call these tools to get things done:

- create_project(name, prompt, platform) → Create a new app project
- generate_code(project_id, description, stack) → Generate code files
- build_project(project_id) → Run npm install + build
- security_audit(project_id) → Scan for security issues
- code_cleanup(project_id) → Remove dead code and logs
- git_checkpoint(project_id, message) → Save state with git commit
- git_revert(project_id, commit_hash) → Revert to previous commit
- list_project_files(project_id) → List all project files
- read_file(project_id, file_path) → Read file contents
- write_file(project_id, file_path, content) → Write/update a file
- memory_read(query, project_id) → Read past memories
- memory_write(key, value, type, project_id) → Save memory

## HOW TO DECIDE
When user wants to build something:
1. Propose a plan with smart defaults
2. If user confirms (says "yes", "go", "build it"):
   - create_project → generate_code → build_project (in sequence)
3. If user asks a question → answer directly
4. If user reports a bug → read_file → write_file → build_project

## SMART DEFAULTS
Unless user specifies otherwise:
- Platform: web (Next.js 15, App Router, TypeScript, Tailwind, shadcn/ui)
- Mobile: Expo SDK 54, React Native, TypeScript, NativeWind
- Database: SQLite with Drizzle ORM
- Auth: Clerk
- AI: DeepSeek
- Design: Clean, modern, responsive

## PONYTAIL RULES (ALWAYS APPLY)
1. Does this need to exist? → Skip (YAGNI)
2. Does stdlib do it? → Use stdlib
3. Native feature? → Use it
4. Installed dep? → Use it
5. One line? → One line
6. Only then: minimum that works

SAFETY: Never cut corners on validation, errors, security, accessibility, data integrity.

## CRITICAL RULES
- NEVER import <Html>, <Head>, <Main>, <NextScript> from 'next/document' in any page
- These are ONLY allowed in pages/_document.js
- For App Router, use standard JSX (<div>, <main>, etc.)
- NEVER create 404 pages with next/document imports
- Always include not-found.tsx for App Router static export

## USER PREFERENCES
${userPrefs}

${projectContext ? `## CURRENT PROJECT\n${projectContext}` : ""}

## SKILLS AVAILABLE
${skills.map((s) => `- ${s}`).join("\n")}

## RESPONSE FORMAT
- Be concise and action-oriented
- When proposing a plan, number the steps
- After tool calls, summarize what was done
- If something fails, explain why and suggest a fix
`;
}

async function loadUserPreferences(): Promise<string> {
  try {
    // Try to load from memory system
    const res = await fetch("http://localhost:3000/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "search", query: "user preference" }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.results?.length) {
        return data.results
          .map((r: any) => `- ${r.key}: ${r.value}`)
          .join("\n");
      }
    }
  } catch {
    // Memory system may not be available
  }

  // Fallback to known preferences from project history
  return `- Fonts: Playfair Display (headings) + Geist Sans (body)
- Colors: Purple-pink gradients preferred
- Stack: Next.js, React, TypeScript, Tailwind, shadcn/ui, SQLite
- Style: Minimalist, clean, modern
- Auth: Clerk (optional)`;
}

async function loadProjectContext(projectId: string): Promise<string> {
  try {
    const metaPath = path.join(PROJECTS_DIR, projectId, ".buildany.json");
    const content = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(content);
    return `Project: ${meta.name}\nPlatform: ${meta.platform}\nCreated: ${meta.createdAt}\nPrompt: ${meta.prompt}`;
  } catch {
    return "";
  }
}
