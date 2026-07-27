import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";

// Build a project: npm install → next build (static export)
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);
    const outDir = path.join(projectDir, "out");

    // Check project exists
    try {
      await fs.access(projectDir);
    } catch {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update status
    await db.update(projects)
      .set({ status: "building", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    // Run build in background
    buildProject(projectId, projectDir, outDir);

    return NextResponse.json({
      success: true,
      status: "building",
      message: "Build started...",
    });

  } catch (error: any) {
    console.error("[Build] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function buildProject(projectId: string, projectDir: string, outDir: string) {
  try {
    console.log("[Build] Starting:", projectId);

    // Clean previous build
    try {
      await fs.rm(outDir, { recursive: true, force: true });
      await fs.rm(path.join(projectDir, ".next"), { recursive: true, force: true });
    } catch {}

    // npm install
    console.log("[Build] npm install...");
    // Clean node_modules to prevent corruption from concurrent builds
    try {
      await fs.rm(path.join(projectDir, "node_modules"), { recursive: true, force: true });
      await fs.rm(path.join(projectDir, "package-lock.json"), { force: true });
    } catch {}
    await runCommand("npm", ["install"], projectDir, 180000);

    // next build with static export
    console.log("[Build] next build (static export)...");
    await runCommand("npx", ["next", "build"], projectDir, 300000);

    // Verify output exists
    try {
      await fs.access(path.join(outDir, "index.html"));
      console.log("[Build] Output verified at:", outDir);
    } catch {
      throw new Error("Build completed but out/index.html not found. Check next.config.js has output: 'export'");
    }

    // Git checkpoint
    try {
      const { execSync } = await import("child_process");
      execSync("git add .", { cwd: projectDir, stdio: "ignore" });
      execSync('git commit -m "Build: static export"', { cwd: projectDir, stdio: "ignore" });
    } catch {}

    // Update status
    await db.update(projects)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    console.log("[Build] Complete:", projectId);

  } catch (error: any) {
    console.error("[Build] Failed:", error);
    await db.update(projects)
      .set({ status: "build_failed", updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }
}

// Helper: run command with spawn, collect output
function runCommand(cmd: string, args: string[], cwd: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      env: { ...process.env, NODE_ENV: "production" },
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        console.error(`[Build] Command exited with code ${code}`);
        console.error("[Build] stdout:", stdout.slice(-500));
        console.error("[Build] stderr:", stderr.slice(-500));
      }
      // Resolve even on non-zero exit — Next.js may warn but still produce output
      resolve();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
