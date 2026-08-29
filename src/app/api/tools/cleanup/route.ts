import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const PROJECTS_DIR = "/data/projects";
const MAX_PROJECT_AGE_DAYS = 30; // Auto-delete projects older than 30 days
const MAX_TOTAL_SIZE_GB = 50; // Warn when total exceeds 50GB

interface ProjectInfo {
  id: string;
  size: number;
  sizeHuman: string;
  lastModified: string;
  ageDays: number;
  fileCount: number;
}

async function getDirectorySize(dirPath: string): Promise<number> {
  let total = 0;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += await getDirectorySize(fullPath);
      } else {
        const stat = await fs.stat(fullPath);
        total += stat.size;
      }
    }
  } catch { /* ignore */ }
  return total;
}

async function getFileCount(dirPath: string): Promise<number> {
  let count = 0;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== ".next") {
        count += await getFileCount(fullPath);
      } else if (entry.isFile()) {
        count++;
      }
    }
  } catch { /* ignore */ }
  return count;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Get all projects with sizes
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    const projects: ProjectInfo[] = [];
    let totalSize = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const projectPath = path.join(PROJECTS_DIR, entry.name);
      const size = await getDirectorySize(projectPath);
      const stat = await fs.stat(projectPath);
      const ageDays = Math.floor((Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24));
      const fileCount = await getFileCount(projectPath);

      totalSize += size;
      projects.push({
        id: entry.name,
        size,
        sizeHuman: formatBytes(size),
        lastModified: stat.mtime.toISOString(),
        ageDays,
        fileCount,
      });
    }

    // Sort by size (largest first)
    projects.sort((a, b) => b.size - a.size);

    if (action === "cleanup") {
      // Delete old projects
      const deleted: string[] = [];
      const errors: string[] = [];

      for (const project of projects) {
        if (project.ageDays > MAX_PROJECT_AGE_DAYS) {
          try {
            const projectPath = path.join(PROJECTS_DIR, project.id);
            await fs.rm(projectPath, { recursive: true, force: true });
            deleted.push(project.id);
          } catch (e: any) {
            errors.push(`${project.id}: ${e.message}`);
          }
        }
      }

      // Also clean node_modules from remaining projects to save space
      let cleanedNodeModules = 0;
      for (const project of projects) {
        if (deleted.includes(project.id)) continue;
        const nmPath = path.join(PROJECTS_DIR, project.id, "node_modules");
        try {
          const nmStat = await fs.stat(nmPath);
          if (nmStat.isDirectory()) {
            await fs.rm(nmPath, { recursive: true, force: true });
            cleanedNodeModules++;
          }
        } catch { /* no node_modules */ }
      }

      return NextResponse.json({
        success: true,
        deleted,
        cleanedNodeModules,
        errors,
        freedSpace: deleted.length > 0 ? "Projects deleted" : "No old projects found",
      });
    }

    // Default: return storage info
    return NextResponse.json({
      projects,
      totalSize,
      totalSizeHuman: formatBytes(totalSize),
      projectCount: projects.length,
      warning: totalSize > MAX_TOTAL_SIZE_GB * 1024 * 1024 * 1024,
      maxSizeGB: MAX_TOTAL_SIZE_GB,
    });

  } catch (error: any) {
    console.error("[Storage] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const projectPath = path.join(PROJECTS_DIR, projectId);
    const resolved = path.resolve(projectPath);
    const resolvedProjects = path.resolve(PROJECTS_DIR);
    if (!resolved.startsWith(resolvedProjects)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    await fs.rm(projectPath, { recursive: true, force: true });
    return NextResponse.json({ success: true, message: `Deleted ${projectId}` });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
