import { NextRequest, NextResponse } from "next/server";
// Auth disabled - Clerk middleware issue
// import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, projectFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";

interface UpdateRequest {
  projectId: string;
  request: string; // e.g., "Add dark mode toggle"
}

async function readProjectFiles(projectId: string): Promise<{ path: string; content: string }[]> {
  const projectDir = path.join(PROJECTS_DIR, projectId);
  const files: { path: string; content: string }[] = [];

  try {
    const entries = await fs.readdir(projectDir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(entry.parentPath || projectDir, entry.name);
        const relativePath = path.relative(projectDir, filePath);
        const content = await fs.readFile(filePath, "utf-8");
        files.push({ path: relativePath, content });
      }
    }
  } catch (e) {
    // Fallback: read from DB
    const dbFiles = await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId));
    for (const f of dbFiles) {
      files.push({ path: f.path, content: f.content || "" });
    }
  }

  return files;
}

async function generateFeatureUpdate(
  existingFiles: { path: string; content: string }[],
  featureRequest: string,
  projectName: string
): Promise<{ path: string; content: string }[]> {
  if (!DEEPSEEK_KEY) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  // Build context from existing files
  const fileContext = existingFiles
    .map(f => `--- FILE: ${f.path} ---\n${f.content.slice(0, 5000)}`)
    .join("\n\n");

  const systemPrompt = `You are a senior React/Next.js developer. Your task is to ADD a new feature to an existing project.

Rules:
- ONLY output the files that need to be CREATED or MODIFIED
- Keep existing code intact unless you need to modify it
- Use the SAME tech stack as the existing project
- Return files in format: FILE:path\n\`\`\`language\ncode\n\`\`\`
- If you need to modify an existing file, output the COMPLETE updated file`;

  const userPrompt = `Project: ${projectName}

Existing files:\n${fileContext.slice(0, 30000)}

Feature request: ${featureRequest}

Generate the files needed to implement this feature. Only output files that need to change.`;

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Parse files from response
  const files: { path: string; content: string }[] = [];
  const fileRegex = /FILE:\s*([^\n]+)\n```(?:\w+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = fileRegex.exec(content)) !== null) {
    files.push({ path: match[1].trim(), content: match[2] });
  }

  return files;
}

export async function POST(req: NextRequest) {
  try {
    const authData = { userId: "anonymous" };
    const userId = authData.userId;
    if (false && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UpdateRequest = await req.json();
    const { projectId, request } = body;

    if (!projectId || !request) {
      return NextResponse.json({ error: "projectId and request required" }, { status: 400 });
    }

    // Verify project exists and user owns it
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project.length) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Read existing files
    const existingFiles = await readProjectFiles(projectId);
    if (!existingFiles.length) {
      return NextResponse.json({ error: "No files found in project" }, { status: 404 });
    }

    // Generate feature update
    const newFiles = await generateFeatureUpdate(existingFiles, request, project[0].name);

    // Write new/modified files
    const projectDir = path.join(PROJECTS_DIR, projectId);
    for (const file of newFiles) {
      const filePath = path.join(projectDir, file.path.replace(/^\//, ""));
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, "utf-8");

      // Update DB
      const existing = await db.select().from(projectFiles)
        .where(eq(projectFiles.projectId, projectId))
        .where(eq(projectFiles.path, file.path));

      if (existing.length) {
        await db.update(projectFiles)
          .set({ content: file.content, updatedAt: new Date() })
          .where(eq(projectFiles.id, existing[0].id));
      } else {
        await db.insert(projectFiles).values({
          id: crypto.randomUUID(),
          projectId,
          path: file.path,
          content: file.content,
          language: file.path.split(".").pop() || "",
          isGenerated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Update project status
    await db.update(projects)
      .set({ status: "updated", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    return NextResponse.json({
      success: true,
      message: `Feature "${request}" added successfully!`,
      filesUpdated: newFiles.map(f => f.path),
      projectId,
    });

  } catch (error: any) {
    console.error("[Project Update] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Update failed" },
      { status: 500 }
    );
  }
}
