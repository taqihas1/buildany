import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, projectFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";
const EXCLUDED_DIRS = ["node_modules", ".git", ".next", "out", "dist", "build", ".open-next"];

// Build a project: read from disk -> npm install -> next build
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);
    const outDir = path.join(projectDir, "out");

    // Step 1: Read files from disk (Kelly saves files to disk now)
    console.log("[Build] Reading files from disk for:", projectId);
    
    let files: Array<{path: string, content: string}> = [];
    
    // First, try reading files from disk
    try {
      await fs.access(projectDir);
      const diskFiles = await collectFilesFromDisk(projectDir, "");
      files = diskFiles.map(f => ({
        path: f.relativePath,
        content: f.content
      }));
      console.log(`[Build] Found ${files.length} files on disk at ${projectDir}`);
    } catch (e) {
      console.log("[Build] No files on disk yet, checking DB...");
    }
    
    // Fallback: read from DB (for legacy projects)
    if (files.length === 0) {
      const dbFiles = await db.select().from(projectFiles)
        .where(eq(projectFiles.projectId, projectId));
      
      if (dbFiles.length === 0) {
        return NextResponse.json({ error: "No files found for this project" }, { status: 404 });
      }
      
      files = dbFiles.map(f => ({
        path: f.path,
        content: f.content || ""
      }));
      
      // Write DB files to disk
      for (const file of files) {
        const filePath = path.join(projectDir, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content, "utf-8");
      }
      console.log(`[Build] Wrote ${files.length} files from DB to ${projectDir}`);
    }

    // Step 2: Detect project structure
    const hasSrcDir = await fileExists(path.join(projectDir, "src"));
    const hasAppDir = await fileExists(path.join(projectDir, "src", "app")) || await fileExists(path.join(projectDir, "app"));
    const hasPagesDir = await fileExists(path.join(projectDir, "src", "pages")) || await fileExists(path.join(projectDir, "pages"));
    
    console.log(`[Build] Project structure: src=${hasSrcDir}, app=${hasAppDir}, pages=${hasPagesDir}`);

    // Step 3: Ensure package.json exists
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
      console.log("[Build] Created package.json");
    }

    // Step 4: Ensure next.config.js exists
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
      console.log("[Build] Created next.config.js");
    }

    // Step 5: Ensure tsconfig.json exists with correct paths
    const tsConfigPath = path.join(projectDir, "tsconfig.json");
    try {
      await fs.access(tsConfigPath);
    } catch {
      // Set paths based on project structure
      // If src/ exists, @/* should map to ./src/*
      // Otherwise, @/* maps to ./*
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
      console.log("[Build] Created tsconfig.json with paths:", pathMapping);
    }

    // Step 6: Update status and build
    await db.update(projects)
      .set({ status: "building", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    // Run build in background
    buildProject(projectId, projectDir, outDir);

    return NextResponse.json({
      success: true,
      status: "building",
      message: "Build started with " + files.length + " files...",
    });

  } catch (error: any) {
    console.error("[Build] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: recursively collect files from disk (excluding node_modules, .git, etc.)
async function collectFilesFromDisk(dir: string, basePath: string): Promise<Array<{relativePath: string, content: string}>> {
  const results: Array<{relativePath: string, content: string}> = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    // Skip excluded directories
    if (EXCLUDED_DIRS.includes(entry.name)) {
      continue;
    }
    
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

async function buildProject(projectId: string, projectDir: string, outDir: string) {
  try {
    console.log("[Build] Starting:", projectId);

    const hasAppDir = await fileExists(path.join(projectDir, "app")) || await fileExists(path.join(projectDir, "src", "app"));
    const hasPagesDir = await fileExists(path.join(projectDir, "pages")) || await fileExists(path.join(projectDir, "src", "pages"));
    const hasIndexHtml = await fileExists(path.join(projectDir, "index.html"));
    let hasNextJs = false;
      try {
        const pkgContent = await fs.readFile(path.join(projectDir, "package.json"), "utf-8");
        const pkg = JSON.parse(pkgContent);
        hasNextJs = !!(pkg.dependencies?.next || pkg.devDependencies?.next);
      } catch {}
      const isStaticHtml = hasIndexHtml && !hasAppDir && !hasPagesDir && !hasNextJs;

    try {
      await fs.rm(outDir, { recursive: true, force: true });
      await fs.rm(path.join(projectDir, ".next"), { recursive: true, force: true });
    } catch {}

    if (isStaticHtml) {
      console.log("[Build] Detected static HTML app, copying files to out/...");
      await copyDir(projectDir, outDir, EXCLUDED_DIRS);
      console.log("[Build] Static files copied to:", outDir);
    } else {
      console.log("[Build] npm install...");
      await runCommand("npm", ["install"], projectDir, 120000);

      console.log("[Build] next build (static export)...");
      await runCommand("npx", ["next", "build", "--no-lint"], projectDir, 300000);

      try {
        await fs.access(path.join(outDir, "index.html"));
        console.log("[Build] Output verified at:", outDir);
      } catch {
        throw new Error("Build completed but out/index.html not found");
      }
    }

    try {
      const { execSync } = await import("child_process");
      execSync("git add .", { cwd: projectDir, stdio: "ignore" });
      execSync('git commit -m "Build: static export"', { cwd: projectDir, stdio: "ignore" });
    } catch {}

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
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src: string, dest: string, exclude: string[] = []) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, exclude);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

function runCommand(cmd: string, args: string[], cwd: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      env: { ...process.env, NODE_ENV: "production" },
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => { stdout += data.toString(); });
    child.stderr?.on("data", (data) => { stderr += data.toString(); });

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
      resolve();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
