import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);
const PROJECTS_DIR = process.env.PROJECTS_DIR || "/root/buildany/projects";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || "";

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const KELLY_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_project",
      description: "Create a new app project. Returns project ID.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Project name" },
          prompt: { type: "string", description: "User's app description" },
          platform: { type: "string", enum: ["web", "mobile", "both"], description: "Target platform" },
        },
        required: ["name", "prompt", "platform"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_code",
      description: "Generate code files for a project using AI. Writes files to disk.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          filePath: { type: "string", description: "Relative file path to create (e.g. src/App.tsx)" },
          prompt: { type: "string", description: "What code to generate" },
          language: { type: "string", description: "TypeScript, TSX, etc." },
        },
        required: ["projectId", "filePath", "prompt"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "build_project",
      description: "Run npm install + build for a project. Returns build output.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
        },
        required: ["projectId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "security_audit",
      description: "Run security audit on a project. Returns findings.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
        },
        required: ["projectId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "code_cleanup",
      description: "Clean up dead code, unused imports, formatting in a project.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
        },
        required: ["projectId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "git_checkpoint",
      description: "Create a git checkpoint (commit) for a project.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          message: { type: "string", description: "Commit message" },
        },
        required: ["projectId", "message"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "git_revert",
      description: "Revert a project to a previous git checkpoint.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          commitHash: { type: "string", description: "Commit hash to revert to" },
        },
        required: ["projectId", "commitHash"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_project_files",
      description: "List all files in a project directory.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
        },
        required: ["projectId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "Read a file from a project.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          filePath: { type: "string", description: "Relative file path" },
        },
        required: ["projectId", "filePath"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description: "Write content to a file in a project. Creates dirs if needed.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          filePath: { type: "string", description: "Relative file path" },
          content: { type: "string", description: "File content" },
        },
        required: ["projectId", "filePath", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "memory_read",
      description: "Read from BuildAny memory (OKF/MEMORY.md).",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Memory key or path" },
        },
        required: ["key"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "memory_write",
      description: "Write to BuildAny memory (OKF/MEMORY.md).",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Memory key" },
          content: { type: "string", description: "Content to store" },
        },
        required: ["key", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "github_push",
      description: "Push project code to GitHub. Creates repo if needed.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          repoName: { type: "string", description: "GitHub repo name" },
          commitMessage: { type: "string", description: "Commit message" },
        },
        required: ["projectId", "repoName", "commitMessage"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cloudflare_deploy",
      description: "Deploy project to Cloudflare Pages.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID" },
          projectName: { type: "string", description: "Cloudflare project name" },
        },
        required: ["projectId", "projectName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cloudflare_purge_cache",
      description: "Purge Cloudflare cache for a domain.",
      parameters: {
        type: "object",
        properties: {
          zoneId: { type: "string", description: "Cloudflare zone ID" },
        },
        required: ["zoneId"],
      },
    },
  },
];

export async function executeTool(name: string, args: any): Promise<ToolResult> {
  try {
    switch (name) {
      case "create_project":
        return await toolCreateProject(args);
      case "generate_code":
        return await toolGenerateCode(args);
      case "build_project":
        return await toolBuildProject(args);
      case "security_audit":
        return await toolSecurityAudit(args);
      case "code_cleanup":
        return await toolCodeCleanup(args);
      case "git_checkpoint":
        return await toolGitCheckpoint(args);
      case "git_revert":
        return await toolGitRevert(args);
      case "list_project_files":
        return await toolListFiles(args);
      case "read_file":
        return await toolReadFile(args);
      case "write_file":
        return await toolWriteFile(args);
      case "memory_read":
        return await toolMemoryRead(args);
      case "memory_write":
        return await toolMemoryWrite(args);
      case "github_push":
        return await toolGitHubPush(args);
      case "cloudflare_deploy":
        return await toolCloudflareDeploy(args);
      case "cloudflare_purge_cache":
        return await toolCloudflarePurge(args);
      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/* ─── TOOL IMPLEMENTATIONS ─── */

async function toolCreateProject(args: any): Promise<ToolResult> {
  const id = args.name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();
  const dir = path.join(PROJECTS_DIR, id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "README.md"), `# ${args.name}\n\n${args.prompt}\n`);
  return { success: true, data: { projectId: id, path: dir } };
}

async function toolGenerateCode(args: any): Promise<ToolResult> {
  if (!DEEPSEEK_API_KEY) return { success: false, error: "DEEPSEEK_API_KEY not set" };
  const projectDir = path.join(PROJECTS_DIR, args.projectId);
  const fullPath = path.join(projectDir, args.filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  const prompt = `Generate ${args.language || "TypeScript"} code for: ${args.prompt}\n\nRules:\n- NO imports from next/document (no Html, Head, Main, NextScript)\n- Use standard JSX for App Router pages\n- Return ONLY the code, no markdown fences\n- Include \"use client\" or \"use server\" directives as needed`;

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "deepseek-v4-pro", messages: [{ role: "user", content: prompt }], temperature: 0.2 }),
  });
  if (!res.ok) return { success: false, error: `DeepSeek error: ${res.status}` };
  const data = await res.json();
  let code = data.choices?.[0]?.message?.content || "";
  code = code.replace(/\`\`\`[a-z]*\n?/g, "").replace(/\`\`\`$/g, "").trim();
  await fs.writeFile(fullPath, code, "utf-8");
  return { success: true, data: { filePath: args.filePath, bytes: code.length } };
}

async function toolBuildProject(args: any): Promise<ToolResult> {
  const projectDir = path.join(PROJECTS_DIR, args.projectId);
  try {
    const { stdout, stderr } = await execAsync("npm install && npm run build", { cwd: projectDir, timeout: 120000 });
    return { success: true, data: { stdout, stderr } };
  } catch (e: any) {
    return { success: false, error: e.stderr || e.message };
  }
}

async function toolSecurityAudit(args: any): Promise<ToolResult> {
  const projectDir = path.join(PROJECTS_DIR, args.projectId);
  const findings: string[] = [];
  try {
    const files = await listAllFiles(projectDir);
    for (const f of files) {
      const content = await fs.readFile(f, "utf-8");
      if (/api[_-]?key|password|secret|token/i.test(content) && !/process\.env/i.test(content)) {
        findings.push(`Possible hardcoded secret in ${path.relative(projectDir, f)}`);
      }
      if (/eval\s*\(|Function\s*\(/i.test(content)) {
        findings.push(`Dangerous eval/Function in ${path.relative(projectDir, f)}`);
      }
    }
    return { success: true, data: { findings, passed: findings.length === 0 } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function toolCodeCleanup(args: any): Promise<ToolResult> {
  const projectDir = path.join(PROJECTS_DIR, args.projectId);
  try {
    await execAsync("npx prettier --write .", { cwd: projectDir, timeout: 60000 });
    return { success: true, data: { message: "Prettier formatting applied" } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function toolGitCheckpoint(args: any): Promise<ToolResult> {
  const projectDir = path.join(PROJECTS_DIR, args.projectId);
  try {
    await execAsync(`git add -A && git commit -m "${args.message.replace(/"/g, '\\"')}"`, { cwd: projectDir });
    const { stdout } = await execAsync("git rev-parse HEAD", { cwd: projectDir });
    return { success: true, data: { commitHash: stdout.trim() } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function toolGitRevert(args: any): Promise<ToolResult> {
  const projectDir = path.join(PROJECTS_DIR, args.projectId);
  try {
    await execAsync(`git reset --hard ${args.commitHash}`, { cwd: projectDir });
    return { success: true, data: { revertedTo: args.commitHash } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function toolListFiles(args: any): Promise<ToolResult> {
  const projectDir = path.join(PROJECTS_DIR, args.projectId);
  try {
    const files = await listAllFiles(projectDir);
    return { success: true, data: { files: files.map((f) => path.relative(projectDir, f)) } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function toolReadFile(args: any): Promise<ToolResult> {
  const projectDir = path.join(PROJECTS_DIR, args.projectId);
  const fullPath = path.join(projectDir, args.filePath);
  if (!fullPath.startsWith(projectDir)) return { success: false, error: "Path traversal blocked" };
  try {
    const content = await fs.readFile(fullPath, "utf-8");
    return { success: true, data: { content } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function toolWriteFile(args: any): Promise<ToolResult> {
  const projectDir = path.join(PROJECTS_DIR, args.projectId);
  const fullPath = path.join(projectDir, args.filePath);
  if (!fullPath.startsWith(projectDir)) return { success: false, error: "Path traversal blocked" };
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, args.content, "utf-8");
  return { success: true, data: { filePath: args.filePath, bytes: args.content.length } };
}

async function toolMemoryRead(args: any): Promise<ToolResult> {
  const memPath = path.join(BUILDANY_DIR, "memory", `${args.key}.md`);
  try {
    const content = await fs.readFile(memPath, "utf-8");
    return { success: true, data: { key: args.key, content } };
  } catch {
    return { success: false, error: `Memory key '${args.key}' not found` };
  }
}

async function toolMemoryWrite(args: any): Promise<ToolResult> {
  const memDir = path.join(BUILDANY_DIR, "memory");
  await fs.mkdir(memDir, { recursive: true });
  const memPath = path.join(memDir, `${args.key}.md`);
  await fs.writeFile(memPath, args.content, "utf-8");
  return { success: true, data: { key: args.key, saved: true } };
}

async function toolGitHubPush(args: any): Promise<ToolResult> {
  if (!GITHUB_TOKEN) return { success: false, error: "GITHUB_TOKEN not set" };
  const projectDir = path.join(PROJECTS_DIR, args.projectId);
  try {
    const remoteUrl = `https://${GITHUB_TOKEN}@github.com/taqihas1/${args.repoName}.git`;
    const initCheck = await execAsync("git rev-parse --git-dir", { cwd: projectDir }).catch(() => null);
    if (!initCheck) await execAsync("git init && git branch -m main", { cwd: projectDir });
    await execAsync(`git remote add origin ${remoteUrl} 2>/dev/null || git remote set-url origin ${remoteUrl}`, { cwd: projectDir });
    await execAsync("git add -A", { cwd: projectDir });
    await execAsync(`git commit -m "${args.commitMessage.replace(/"/g, '\\"')}" 2>/dev/null || true`, { cwd: projectDir });
    await execAsync("git push -u origin main --force", { cwd: projectDir });
    return { success: true, data: { repo: `https://github.com/taqihas1/${args.repoName}`, pushed: true } };
  } catch (e: any) {
    return { success: false, error: e.stderr || e.message };
  }
}

async function toolCloudflareDeploy(args: any): Promise<ToolResult> {
  if (!CLOUDFLARE_API_TOKEN) return { success: false, error: "CLOUDFLARE_API_TOKEN not set" };
  const projectDir = path.join(PROJECTS_DIR, args.projectId);
  try {
    const distDir = path.join(projectDir, "dist");
    const zipPath = path.join(projectDir, "deploy.zip");
    await execAsync(`zip -r ${zipPath} dist/`, { cwd: projectDir });
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${args.projectName}/deployments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ branch: "main" }),
    });
    const data = await res.json();
    if (!data.success) return { success: false, error: JSON.stringify(data.errors) };
    return { success: true, data: { deploymentId: data.result.id, url: data.result.url } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function toolCloudflarePurge(args: any): Promise<ToolResult> {
  if (!CLOUDFLARE_API_TOKEN) return { success: false, error: "CLOUDFLARE_API_TOKEN not set" };
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${args.zoneId}/purge_cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ purge_everything: true }),
    });
    const data = await res.json();
    if (!data.success) return { success: false, error: JSON.stringify(data.errors) };
    return { success: true, data: { purged: true } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/* ─── HELPERS ─── */

async function listAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !["node_modules", ".git", ".next", ".npm-cache", ".cacache", "out", "dist"].includes(entry.name)) {
      files.push(...(await listAllFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}
