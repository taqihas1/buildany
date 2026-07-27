import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

interface FileEntry {
  path: string;
  content: string;
}

async function getAllFiles(dir: string, base = ""): Promise<FileEntry[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: FileEntry[] = [];
  for (const entry of entries) {
    const relativePath = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist", "out"].includes(entry.name)) continue;
      files.push(...await getAllFiles(fullPath, relativePath));
    } else {
      const content = await fs.readFile(fullPath, "utf-8");
      files.push({ path: relativePath, content });
    }
  }
  return files;
}

function parseGeneratedFiles(raw: string): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const codeBlockRegex = /```json\s*([\s\S]*?)```/;
  const match = raw.match(codeBlockRegex);
  if (!match) {
    const fileRegex = /{\s*"file"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"([\s\S]*?)"\s*}/g;
    let m;
    while ((m = fileRegex.exec(raw)) !== null) {
      const filePath = m[1];
      let content = m[2];
      content = content.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      files.push({ path: filePath, content });
    }
    return files;
  }
  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item.file && item.content !== undefined) {
          let content = item.content;
          if (typeof content === "string") {
            content = content.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
          }
          files.push({ path: item.file, content });
        }
      }
    }
  } catch (e) {}
  return files;
}

async function callDeepSeek(messages: any[]) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "deepseek-chat", messages, temperature: 0.3 }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project || !project.reviewData) {
      return NextResponse.json({ error: "No review data found. Run code review first." }, { status: 400 });
    }

    const reviewData = JSON.parse(project.reviewData);
    const review = reviewData.review;

    const projectDir = path.join(PROJECTS_DIR, projectId);
    const files = await getAllFiles(projectDir);

    const fileList = files.map(f => `--- ${f.path} ---\n${f.content}`).join("\n\n");

    const fixPrompt = `You are a lazy senior developer. Fix the following code based on these review findings. Generate ALL files as a JSON array.

REVIEW FINDINGS:
${review}

CURRENT FILES:
${fileList}

INSTRUCTIONS:
1. Apply ALL review findings to simplify and reduce code
2. Delete unnecessary abstractions, use stdlib, shrink loops
3. Keep the app functional - same features, less code
4. Format as JSON array: [{"file": "path", "content": "..."}, ...]

FIXED FILES:`;

    const generated = await callDeepSeek([
      { role: "system", content: "You are an expert minimalist developer. Apply review fixes ruthlessly." },
      { role: "user", content: fixPrompt },
    ]);

    const fixedFiles = parseGeneratedFiles(generated);
    if (fixedFiles.length === 0) {
      return NextResponse.json({ error: "Could not parse fixed files" }, { status: 500 });
    }

    // Write fixed files
    for (const file of fixedFiles) {
      const filePath = path.join(projectDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, "utf-8");
    }

    // Git checkpoint
    try {
      const { execSync } = await import("child_process");
      execSync("git add .", { cwd: projectDir, stdio: "ignore" });
      execSync('git commit -m "Ponytail code review fixes" || true', { cwd: projectDir, stdio: "ignore" });
    } catch {}

    return NextResponse.json({
      success: true,
      filesFixed: fixedFiles.length,
      files: fixedFiles.map(f => f.path),
    });
  } catch (error: any) {
    console.error("[CodeReviewFix] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
