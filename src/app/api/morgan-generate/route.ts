import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, projectFiles, conversations } from "@/lib/db/schema";
import { generateShortName } from "@/lib/project-name-generator";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const PROJECTS_DIR = "/data/projects";

// ponytail: direct DeepSeek call, no multi-phase orchestration. One shot, files only.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type = "web", appType, userId } = body;
    const projectType = appType || type;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 1. Create project record
    const projectId = crypto.randomUUID();
    const shortName = generateShortName(prompt);

    await db.insert(projects).values({
      id: projectId,
      userId: userId || "guest-" + crypto.randomUUID(),
      name: shortName,
      description: prompt,
      type: projectType as "web" | "mobile" | "dashboard",
      status: "creating",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Create filesystem project dir + git init
    const projectDir = path.join(PROJECTS_DIR, projectId);
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, "src", "app"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "src", "components"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "src", "lib"), { recursive: true });

    // Git init
    try {
      execSync("git init", { cwd: projectDir, stdio: "ignore" });
      execSync('git config user.email "morgan@buildany.local"', { cwd: projectDir, stdio: "ignore" });
      execSync('git config user.name "Morgan"', { cwd: projectDir, stdio: "ignore" });
    } catch {
      // ponytail: git optional, don't fail if missing
    }

    // 3. Log user prompt
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId,
      role: "user",
      content: prompt,
      model: "user",
      createdAt: new Date(),
    });

    // 4. Return immediately — Morgan generates in background
    generateWithMorgan(projectId, prompt, projectType, projectDir);

    return NextResponse.json({
      success: true,
      projectId,
      projectName: shortName,
      status: "creating",
      message: `🚀 Project "${shortName}" created! Morgan is generating your app...`,
    });

  } catch (error: any) {
    console.error("[Morgan] Error:", error);
    return NextResponse.json(
      { error: "Morgan orchestration failed", message: error.message },
      { status: 500 }
    );
  }
}

// BACKGROUND: Morgan generates code directly to filesystem
async function generateWithMorgan(
  projectId: string,
  prompt: string,
  type: string,
  projectDir: string
) {
  try {
    console.log("[Morgan BG] Starting generation for:", projectId);

    // Single-shot code generation — ponytail: one call, all files
    const morganPrompt = buildMorganPrompt(prompt, type);

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are Morgan, an expert developer. Return ONLY valid JSON with code files. No explanations. No markdown code blocks around JSON." },
          { role: "user", content: morganPrompt },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON response
    let result: any;
    try {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/```\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      result = JSON.parse(jsonStr);
    } catch {
      // Fallback: try to parse the whole thing
      result = JSON.parse(content);
    }

    const files = result.files || [];

    // Write files to disk + DB
    for (const file of files) {
      const filePath = path.join(projectDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, "utf-8");

      // Also save to DB for quick access
      await db.insert(projectFiles).values({
        id: crypto.randomUUID(),
        projectId,
        path: file.path,
        content: file.content,
        createdAt: new Date(),
      });
    }

    // Write package.json if not provided
    await writePackageJson(projectDir, type);

    // Git checkpoint — initial commit
    try {
      execSync("git add .", { cwd: projectDir, stdio: "ignore" });
      execSync('git commit -m "Initial generation by Morgan"', { cwd: projectDir, stdio: "ignore" });
    } catch {
      // ponytail: git optional
    }

    // Update project status
    await db.update(projects)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    // Log completion
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId,
      role: "assistant",
      content: `✅ Generated ${files.length} files. Ready to build!`,
      model: "morgan",
      createdAt: new Date(),
    });

    console.log("[Morgan BG] Complete:", projectId, files.length, "files");

  } catch (error: any) {
    console.error("[Morgan BG] Failed:", error);
    await db.update(projects)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(projects.id, projectId));
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId,
      role: "system",
      content: `❌ Generation failed: ${error.message}`,
      model: "morgan/error",
      createdAt: new Date(),
    });
  }
}

function buildMorganPrompt(prompt: string, type: string): string {
  return `Build this app: "${prompt}"
Type: ${type}

Generate ONLY these essential files (max 5):
1. package.json
2. next.config.js (with output: 'export', typescript.ignoreBuildErrors: true, eslint.ignoreDuringBuilds: true)
3. src/app/page.tsx (main page, add '// @ts-nocheck' at top)
4. src/app/layout.tsx (root layout, add '// @ts-nocheck' at top. Use ONLY <div> as root, do NOT use <html> or <body> tags — Next.js handles those)
5. src/app/globals.css (styles)

Return ONLY valid JSON:
{
  "files": [
    {"path": "package.json", "content": "..."},
    {"path": "next.config.js", "content": "..."},
    {"path": "src/app/page.tsx", "content": "..."},
    {"path": "src/app/layout.tsx", "content": "..."},
    {"path": "src/app/globals.css", "content": "..."}
  ]
}

Rules:
- Use Next.js 15, React 19, TypeScript, Tailwind CSS
- Make it beautiful and functional
- Use 'use client' for interactive components
- Include lucide-react icons
- Add '// @ts-nocheck' at the top of every .tsx file to avoid strict type errors
- Add '// @ts-nocheck' at the top of every .ts file
- Make sure all object properties match their TypeScript types exactly
- NO placeholder text, NO lorem ipsum
- Real data, real UI`;
}

async function writePackageJson(projectDir: string, type: string) {
  const pkgPath = path.join(projectDir, "package.json");
  try {
    await fs.access(pkgPath);
    return; // Already exists
  } catch {
    // Write default package.json
    const pkg = {
      name: "generated-app",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: {
        next: "^15.0.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        "lucide-react": "^0.400.0",
      },
      devDependencies: {
        typescript: "^5.0.0",
        "@types/node": "^20.0.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        tailwindcss: "^3.4.0",
        postcss: "^8.4.0",
        autoprefixer: "^10.4.0",
      },
    };
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
  }
}
