import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";

// Build a project: npm install → next build → static export
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
    } catch {}

    // npm install
    console.log("[Build] npm install...");
    try {
      execSync("npm install", {
        cwd: projectDir,
        stdio: "pipe",
        timeout: 120000,
      });
    } catch (installError: any) {
      console.error("[Build] npm install failed:", installError.stderr?.toString() || installError.message);
      throw installError;
    }

    // next build — normal build (not static export to avoid <Html> errors)
    console.log("[Build] next build...");
    try {
      execSync("npx next build --no-lint 2>&1 || true", {
        cwd: projectDir,
        stdio: "pipe",
        timeout: 300000,
        env: { ...process.env, NODE_ENV: "production" },
      });
    } catch (buildError: any) {
      console.error("[Build] next build warning:", buildError.stderr?.toString() || buildError.message);
      // Continue even with warnings
    }

    // Check multiple possible output locations
    const possibleOutDirs = [
      outDir,                                    // output: 'export'
      path.join(projectDir, "dist"),             // custom dist
      path.join(projectDir, ".next", "server", "app"),  // app router output
    ];
    
    let foundOutputDir = "";
    for (const dir of possibleOutDirs) {
      try {
        await fs.access(path.join(dir, "index.html"));
        foundOutputDir = dir;
        console.log("[Build] Found output at:", dir);
        break;
      } catch {
        // Try next directory
      }
    }
    
    // If no static export output, try to generate it manually from .next
    if (!foundOutputDir) {
      console.log("[Build] No static export found, checking .next directory...");
      try {
        await fs.access(path.join(projectDir, ".next"));
        // If .next exists, use the standalone server output or copy static files
        const staticDir = path.join(projectDir, ".next", "standalone");
        try {
          await fs.access(staticDir);
          foundOutputDir = staticDir;
          console.log("[Build] Found standalone output at:", staticDir);
        } catch {
          // Try static HTML files
          const staticHtmlDir = path.join(projectDir, ".next", "server", "app");
          try {
            await fs.access(path.join(staticHtmlDir, "index.html"));
            foundOutputDir = staticHtmlDir;
            console.log("[Build] Found app router output at:", staticHtmlDir);
          } catch {
            // No output found
          }
        }
      } catch {
        // .next doesn't exist
      }
    }
    
    if (!foundOutputDir) {
      throw new Error("Build completed but no output found in any expected directory");
    }
    
    // If output is not in 'out', copy it there for consistency
    if (foundOutputDir !== outDir) {
      console.log("[Build] Copying output to 'out' directory...");
      try {
        await fs.mkdir(outDir, { recursive: true });
        execSync(`cp -r "${foundOutputDir}"/* "${outDir}"`, { stdio: "ignore" });
      } catch (copyError: any) {
        console.log("[Build] Copy failed, using original location:", foundOutputDir);
        // Just use the found directory
      }
    }

    // Git checkpoint
    try {
      execSync("git add .", { cwd: projectDir, stdio: "ignore" });
      execSync('git commit -m "Build: generated static export"', { cwd: projectDir, stdio: "ignore" });
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
