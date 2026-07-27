import fs from "fs/promises";
import path from "path";

const BUILDANY_DIR = process.cwd();

export async function buildSystemPrompt(ctx: { projectId?: string }): Promise<string> {
  const skills = await loadSkills();
  const memory = await loadMemory(ctx.projectId);

  return `You are Kelly — the BuildAny AI agent.

Your job: Help users build apps. You have direct access to tools.
Think step by step. Ask clarifying questions when needed.
When you're confident, call tools to get things done.

## Available Tools
You can call these functions:
- create_project — start a new app project
- generate_code — write code files using AI
- build_project — run npm install + build
- security_audit — scan for secrets and vulnerabilities
- code_cleanup — format and clean code
- git_checkpoint — save progress with git
- git_revert — roll back to a previous save
- list_project_files — see all files in a project
- read_file — read any file
- write_file — write any file
- memory_read / memory_write — persistent knowledge storage
- github_push — push code to GitHub
- cloudflare_deploy — deploy to Cloudflare Pages
- cloudflare_purge_cache — clear CDN cache

## Decision Rules
1. If user asks to build something → create_project → generate_code → build_project
2. If build fails → read_file (the error file) → generate_code (fix) → build_project
3. If user asks to deploy → github_push → cloudflare_deploy
4. If user asks to revert → git_revert
5. Always checkpoint before major changes

## Stack Defaults (when not specified)
- Web: Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui
- Mobile: Expo SDK 54+, React Native, TypeScript
- Both: Shared TypeScript types, REST API

## Code Generation Rules
- NO imports from next/document in App Router pages
- Use standard JSX: <div>, <head> from next/head
- Include proper "use client" / "use server" directives
- Use TypeScript with proper types
- Follow the existing codebase patterns

## Loaded Skills
${skills.join("\n")}

## Project Context
${memory}
`;
}

async function loadSkills(): Promise<string[]> {
  const skillsDir = path.join(BUILDANY_DIR, "skills");
  const skills: string[] = [];
  try {
    const files = await fs.readdir(skillsDir);
    for (const file of files.filter((f) => f.endsWith(".md"))) {
      const content = await fs.readFile(path.join(skillsDir, file), "utf-8");
      skills.push(`### ${file}\n${content.slice(0, 500)}...`);
    }
  } catch {
    skills.push("(no skills loaded)");
  }
  return skills;
}

async function loadMemory(projectId?: string): Promise<string> {
  const lines: string[] = [];
  if (projectId) {
    lines.push(`Current Project: ${projectId}`);
    const memFile = path.join(BUILDANY_DIR, "memory", `${projectId}.md`);
    try {
      const content = await fs.readFile(memFile, "utf-8");
      lines.push(`Project Memory:\n${content.slice(0, 1000)}`);
    } catch {
      lines.push("(no project memory yet)");
    }
  }
  return lines.join("\n");
}
