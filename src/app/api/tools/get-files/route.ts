import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";
const EXCLUDED_DIRS = ["node_modules", ".git", ".next", "out", "dist", "build"];

/**
 * Tool: get_project_files
 * Returns all files in a project directory
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);

    try {
      await fs.access(projectDir);
    } catch {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const files = await collectFilesFromDisk(projectDir, "");

    return NextResponse.json({
      success: true,
      projectId,
      files: files.map(f => ({
        path: f.relativePath,
        content: f.content,
      })),
      count: files.length,
    });

  } catch (error: any) {
    console.error("[Tool: get_project_files] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function collectFilesFromDisk(dir: string, basePath: string): Promise<Array<{relativePath: string, content: string}>> {
  const results: Array<{relativePath: string, content: string}> = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (EXCLUDED_DIRS.includes(entry.name)) continue;
    
    const fullPath = path.join(dir, entry.name);
    const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;
    
    if (entry.isDirectory()) {
      const subFiles = await collectFilesFromDisk(fullPath, relativePath);
      results.push(...subFiles);
    } else {
      const content = await fs.readFile(fullPath, "utf-8");
      results.push({ relativePath, content });
    }
  }
  
  return results;
}
