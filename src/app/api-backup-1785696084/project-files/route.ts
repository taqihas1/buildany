import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";

// List files in a project directory
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const filePath = searchParams.get("path");

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);

    if (filePath) {
      // Read specific file
      const targetPath = path.join(projectDir, filePath);
      const resolved = path.resolve(targetPath);
      const resolvedDir = path.resolve(projectDir);
      if (!resolved.startsWith(resolvedDir)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 403 });
      }
      const content = await fs.readFile(targetPath, "utf-8");
      return NextResponse.json({ content });
    } else {
      // List directory tree
      const tree = await listDirRecursive(projectDir, projectDir);
      return NextResponse.json({ files: tree });
    }
  } catch (error: any) {
    console.error("[Files] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function listDirRecursive(dir: string, rootDir: string): Promise<any[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result: any[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    // Skip node_modules, .git, out
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "out") {
      continue;
    }

    if (entry.isDirectory()) {
      const children = await listDirRecursive(fullPath, rootDir);
      result.push({ name: entry.name, path: relPath, type: "directory", children });
    } else {
      result.push({ name: entry.name, path: relPath, type: "file" });
    }
  }

  return result;
}
