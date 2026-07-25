import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

const PROJECTS_DIR = process.env.PROJECTS_DIR || "/root/buildany/projects";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";

/**
 * KELLY TOOLS
 *
 * All capabilities available to Kelly as function calls.
 * No external agents. No context switching.
 * Every tool is a native TypeScript function.
 */

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Tool definitions passed to the LLM
 */
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
          project_id: { type: "string", description: "Project ID" },
          description: { type: "string", description: "What to build" },
          files_to_generate: {
            type: "array",
            items: { type: "string" },
            description: "Specific files to generate (optional - AI decides if empty)",
          },
          stack: {
            type: "string",
            enum: ["nextjs", "expo", "react", "node"],
            description: "Tech stack",
          },
        },
        required: ["project_id", "description"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "build_project",
      description: "Run npm install and build the project. Returns build output.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "security_audit",
      description: "Scan project files for security issues: API keys, SQL injection, XSS, etc.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "code_cleanup",
      description: "Remove dead code, unused imports, console.logs, and fix formatting.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "git_checkpoint",
      description: "Save current state with a git commit.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          message: { type: "string", description: "Commit message" },
        },
        required: ["project_id", "message"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "git_revert",
      description: "Revert project to a previous git commit.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          commit_hash: { type: "string" },
        },
        required: ["project_id", "commit_hash"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_project_files",
      description: "List all files in a project.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "Read contents of a file in a project.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          file_path: { type: "string", description: "Relative path from project root" },
        },
        required: ["project_id", "file_path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description: "Write or overwrite a file in a project.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          file_path: { type: "string" },
          content: { type: "string" },
        },
        required: ["project_id", "file_path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "memory_read",
      description: "Read past memories and context from the memory system.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          project_id: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "memory_write",
      description: "Save a memory, preference, or decision to the memory system.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: { type: "string" },
          type: { type: "string", enum: ["fact", "preference", "decision", "pattern", "bugfix", "project"] },
          project_id: { type: "string" },
        },
        required: ["key", "value", "type"],
      },
    },
  },
];

/**
 * Execute a tool by name
 */
export async function executeTool(name: string, args: any): Promise<ToolResult> {
  console.log(`[Kelly Tool] ${name}`, args);

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
      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    console.error(`[Kelly Tool Error] ${name}:`, err);
    return { success: false, error: err.message };
  }
}

// ─── TOOL IMPLEMENTATIONS ───

async function toolCreateProject(args: any): Promise<ToolResult> {
  const { name, prompt, platform } = args;
  const projectId = crypto.randomUUID();
  const projectPath = path.join(PROJECTS_DIR, projectId);

  await fs.mkdir(projectPath, { recursive: true });
  await fs.mkdir(path.join(projectPath, "src", "app"), { recursive: true });

  // Initialize git
  await execAsync(`cd ${projectPath} && git init && git config user.email "kelly@buildany" && git config user.name "Kelly"`);

  // Save project metadata
  await fs.writeFile(
    path.join(projectPath, ".buildany.json"),
    JSON.stringify({ id: projectId, name, prompt, platform, createdAt: new Date().toISOString() }, null, 2)
  );

  return {
    success: true,
    data: { projectId, projectPath, name, platform },
  };
}

async function toolGenerateCode(args: any): Promise<ToolResult> {
  const { project_id, description, stack = "nextjs" } = args;
  const projectPath = path.join(PROJECTS_DIR, project_id);

  // Verify project exists
  try {
    await fs.access(projectPath);
  } catch {
    return { success: false, error: `Project ${project_id} not found` };
  }

  // Build generation prompt
  const generationPrompt = buildGenerationPrompt(description, stack);

  // Call DeepSeek directly (no Morgan middleman)
  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are an expert ${stack} developer. Generate clean, production-ready code. NEVER import <Html>, <Head>, <Main>, <NextScript> from 'next/document' in pages. Use standard JSX elements instead.`,
        },
        { role: "user", content: generationPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    return { success: false, error: `DeepSeek error: ${await res.text()}` };
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Parse generated files from markdown code blocks
  const files = parseGeneratedFiles(content);

  // Write files to disk
  const writtenFiles: string[] = [];
  for (const [filePath, fileContent] of Object.entries(files)) {
    const fullPath = path.join(projectPath, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, fileContent);
    writtenFiles.push(filePath);
  }

  // Auto-generate not-found.tsx for Next.js App Router
  if (stack === "nextjs" && !files["src/app/not-found.tsx"] && !files["app/not-found.tsx"]) {
    const notFoundPath = path.join(projectPath, "src", "app", "not-found.tsx");
    await fs.mkdir(path.dirname(notFoundPath), { recursive: true });
    await fs.writeFile(
      notFoundPath,
      `export default function NotFound() {\n  return (\n    <div className="flex min-h-screen items-center justify-center">\n      <h1 className="text-2xl font-bold">404 - Page Not Found</h1>\n    </div>\n  );\n}\n`
    );
    writtenFiles.push("src/app/not-found.tsx");
  }

  return {
    success: true,
    data: { files: writtenFiles, count: writtenFiles.length },
  };
}

async function toolBuildProject(args: any): Promise<ToolResult> {
  const { project_id } = args;
  const projectPath = path.join(PROJECTS_DIR, project_id);

  try {
    const { stdout, stderr } = await execAsync(
      `cd ${projectPath} && npm install && npm run build`,
      { timeout: 300000 }
    );
    return {
      success: true,
      data: { output: stdout, errors: stderr || null },
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.stderr || e.message,
      data: { output: e.stdout || "" },
    };
  }
}

async function toolSecurityAudit(args: any): Promise<ToolResult> {
  const { project_id } = args;
  const projectPath = path.join(PROJECTS_DIR, project_id);

  const issues: string[] = [];

  // Scan all files for common security issues
  async function scanDir(dir: string, base = "") {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = path.join(base, entry.name);
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !["node_modules", ".next", ".git"].includes(entry.name)) {
        await scanDir(full, rel);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx|env|json)$/.test(entry.name)) {
        const content = await fs.readFile(full, "utf-8");

        // Check for hardcoded secrets
        if (/['"]sk-[a-zA-Z0-9]{20,}['"]/.test(content)) {
          issues.push(`Possible API key in ${rel}`);
        }
        if (/['"]ghp_[a-zA-Z0-9]{30,}['"]/.test(content)) {
          issues.push(`Possible GitHub token in ${rel}`);
        }

        // Check for SQL injection patterns
        if (/query\s*\(\s*[`"'].*\$\{/.test(content)) {
          issues.push(`Possible SQL injection in ${rel}`);
        }

        // Check for eval / new Function
        if (/\beval\s*\(/.test(content) || /new\s+Function\s*\(/.test(content)) {
          issues.push(`Dangerous eval/Function in ${rel}`);
        }

        // Check for dangerouslySetInnerHTML
        if (/dangerouslySetInnerHTML/.test(content)) {
          issues.push(`dangerouslySetInnerHTML in ${rel}`);
        }
      }
    }
  }

  await scanDir(projectPath);

  return {
    success: true,
    data: {
      issues,
      issueCount: issues.length,
      passed: issues.length === 0,
    },
  };
}

async function toolCodeCleanup(args: any): Promise<ToolResult> {
  const { project_id } = args;
  const projectPath = path.join(PROJECTS_DIR, project_id);

  let cleaned = 0;
  let removedLogs = 0;
  let removedImports = 0;

  async function cleanupDir(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !["node_modules", ".next", ".git"].includes(entry.name)) {
        await cleanupDir(full);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        let content = await fs.readFile(full, "utf-8");
        const original = content;

        // Remove console.logs
        content = content.replace(/console\.(log|warn|error|info)\([^)]*\);?\s*\n?/g, "");

        // Remove unused React imports (Next.js 15+ auto-imports)
        content = content.replace(/import\s+React\s+from\s+['"]react['"];?\s*\n?/g, "");

        if (content !== original) {
          await fs.writeFile(full, content);
          cleaned++;
          removedLogs += (original.match(/console\./g) || []).length;
        }
      }
    }
  }

  await cleanupDir(projectPath);

  return {
    success: true,
    data: { filesCleaned: cleaned, removedLogs, removedImports },
  };
}

async function toolGitCheckpoint(args: any): Promise<ToolResult> {
  const { project_id, message } = args;
  const projectPath = path.join(PROJECTS_DIR, project_id);

  try {
    await execAsync(
      `cd ${projectPath} && git add -A && git commit -m "${message.replace(/"/g, '\\"')}"`,
      { timeout: 30000 }
    );
    const { stdout } = await execAsync(`cd ${projectPath} && git log --oneline -1`);
    return {
      success: true,
      data: { commit: stdout.trim() },
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.stderr || e.message,
    };
  }
}

async function toolGitRevert(args: any): Promise<ToolResult> {
  const { project_id, commit_hash } = args;
  const projectPath = path.join(PROJECTS_DIR, project_id);

  try {
    await execAsync(`cd ${projectPath} && git reset --hard ${commit_hash}`, { timeout: 30000 });
    return {
      success: true,
      data: { revertedTo: commit_hash },
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.stderr || e.message,
    };
  }
}

async function toolListFiles(args: any): Promise<ToolResult> {
  const { project_id } = args;
  const projectPath = path.join(PROJECTS_DIR, project_id);

  const files: string[] = [];
  async function scan(dir: string, base = "") {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = path.join(base, entry.name);
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !["node_modules", ".next", ".git"].includes(entry.name)) {
        await scan(full, rel);
      } else if (entry.isFile()) {
        files.push(rel);
      }
    }
  }

  await scan(projectPath);
  return { success: true, data: { files } };
}

async function toolReadFile(args: any): Promise<ToolResult> {
  const { project_id, file_path } = args;
  const fullPath = path.join(PROJECTS_DIR, project_id, file_path);

  // Security: prevent directory traversal
  const resolved = path.resolve(fullPath);
  const projectRoot = path.resolve(path.join(PROJECTS_DIR, project_id));
  if (!resolved.startsWith(projectRoot)) {
    return { success: false, error: "Access denied" };
  }

  try {
    const content = await fs.readFile(resolved, "utf-8");
    return { success: true, data: { content } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function toolWriteFile(args: any): Promise<ToolResult> {
  const { project_id, file_path, content } = args;
  const fullPath = path.join(PROJECTS_DIR, project_id, file_path);

  // Security: prevent directory traversal
  const resolved = path.resolve(fullPath);
  const projectRoot = path.resolve(path.join(PROJECTS_DIR, project_id));
  if (!resolved.startsWith(projectRoot)) {
    return { success: false, error: "Access denied" };
  }

  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content);
  return { success: true, data: { written: file_path } };
}

async function toolMemoryRead(args: any): Promise<ToolResult> {
  // Delegate to existing memory API
  try {
    const res = await fetch("http://localhost:3000/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "search", query: args.query, project_id: args.project_id }),
    });
    return { success: true, data: await res.json() };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function toolMemoryWrite(args: any): Promise<ToolResult> {
  try {
    const res = await fetch("http://localhost:3000/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "write",
        key: args.key,
        value: args.value,
        type: args.type,
        project_id: args.project_id,
      }),
    });
    return { success: true, data: await res.json() };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── HELPERS ───

function buildGenerationPrompt(description: string, stack: string): string {
  return `Generate a complete ${stack} app based on this description:

"""${description}"""

Requirements:
- Use ${stack === "nextjs" ? "Next.js 15 App Router, React 19, TypeScript, Tailwind CSS" : stack}
- CRITICAL: NEVER import <Html>, <Head>, <Main>, <NextScript> from 'next/document' in any page
- CRITICAL: For App Router, use standard JSX (<div>, <main>, etc.) not next/document components
- Include a package.json with all dependencies
- Include next.config.js with output: 'export'
- Make it visually appealing with modern UI
- Include at least one main page and a layout

Return each file in this format:

### FILE: path/to/file.ext
\`\`\`language
file content here
\`\`\`

Start with package.json, then next.config.js, then layout, then pages.`;
}

function parseGeneratedFiles(content: string): Record<string, string> {
  const files: Record<string, string> = {};
  const fileRegex = /###\s*FILE:\s*(.+?)\n```(?:\w+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = fileRegex.exec(content)) !== null) {
    const filePath = match[1].trim();
    const fileContent = match[2];
    if (filePath && fileContent) {
      files[filePath] = fileContent;
    }
  }
  return files;
}
