import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";

/**
 * Tool: build_project
 * Builds a Next.js project and produces static output
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);
    const outDir = path.join(projectDir, "out");

    // Check project exists
    try {
      await fs.access(projectDir);
    } catch {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Detect project structure
    const hasSrcDir = await fileExists(path.join(projectDir, "src"));
    const hasAppDir = await fileExists(path.join(projectDir, "src", "app")) 
      || await fileExists(path.join(projectDir, "app"));

    // Ensure package.json
    const pkgPath = path.join(projectDir, "package.json");
    try {
      await fs.access(pkgPath);
    } catch {
      const pkg = {
        name: "buildany-project-" + projectId.slice(0, 8),
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start"
        },
        dependencies: {
          next: "^15.0.0",
          react: "^19.0.0",
          "react-dom": "^19.0.0"
        },
        devDependencies: {
          typescript: "^5.0.0",
          "@types/node": "^20.0.0",
          "@types/react": "^19.0.0",
          "@types/react-dom": "^19.0.0"
        }
      };
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
    }

    // Ensure next.config.js
    const nextConfigPath = path.join(projectDir, "next.config.js");
    try {
      await fs.access(nextConfigPath);
    } catch {
      const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
};
module.exports = nextConfig;`;
      await fs.writeFile(nextConfigPath, nextConfig, "utf-8");
    }

    // Ensure tsconfig.json with correct paths
    const tsConfigPath = path.join(projectDir, "tsconfig.json");
    try {
      await fs.access(tsConfigPath);
    } catch {
      const pathMapping = hasSrcDir ? "./src/*" : "./*";
      const tsConfig = {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": [pathMapping] }
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"]
      };
      await fs.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2), "utf-8");
    }

    // Update status
    await db.update(projects)
      .set({ status: "building", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    // Run build in background
    buildInBackground(projectId, projectDir, outDir);

    return NextResponse.json({
      success: true,
      status: "building",
      message: "Build started for project " + projectId,
    });

  } catch (error: any) {
    console.error("[Tool: build_project] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function buildInBackground(projectId: string, projectDir: string, outDir: string) {
  try {
    console.log("[Build] Starting:", projectId);

    // Clean previous build
    try {
      await fs.rm(outDir, { recursive: true, force: true });
      await fs.rm(path.join(projectDir, ".next"), { recursive: true, force: true });
    } catch {}

    // npm install
    console.log("[Build] npm install...");
    await runCommand("npm", ["install"], projectDir, 120000);

    // next build
    console.log("[Build] next build...");
    await runCommand("npx", ["next", "build", "--no-lint"], projectDir, 300000);

    // Verify output
    try {
      await fs.access(path.join(outDir, "index.html"));
      console.log("[Build] Output verified at:", outDir);
    } catch {
      throw new Error("Build completed but out/index.html not found");
    }

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

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

function runCommand(cmd: string, args: string[], cwd: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: true });
    let stdout = "", stderr = "";
    child.stdout?.on("data", (data) => { stdout += data.toString(); });
    child.stderr?.on("data", (data) => { stderr += data.toString(); });
    
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Command timed out"));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        console.error(`[Build] Exit code ${code}`);
        console.error("[Build] stderr:", stderr.slice(-500));
      }
      resolve();
    });

    child.on("error", (err) => { clearTimeout(timer); reject(err); });
  });
}
