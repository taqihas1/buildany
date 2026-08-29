import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const GITHUB_PAT = process.env.GITHUB_PAT || "";
const GITHUB_USER = "taqihas1";
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || "";
const PROJECTS_DIR = "/data/projects";

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, projectName } = await req.json();
    if (!GITHUB_PAT) {
      return NextResponse.json({ error: "GITHUB_PAT not configured" }, { status: 500 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const repoName = `buildany-app-${projectId.slice(0, 8)}`;
    const projectDir = path.join(PROJECTS_DIR, projectId);
    const tmpGitDir = `/tmp/buildany-deploy-${projectId}`;

    // ─── Step 1: Create GitHub repo ───
    console.log("[Deploy] Creating GitHub repo:", repoName);
    const repoRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `token ${GITHUB_PAT}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        name: repoName,
        private: true,
        auto_init: true,
        description: `BuildAny app: ${projectName || projectId}`,
      }),
    });

    if (!repoRes.ok) {
      const err = await repoRes.text();
      // Repo might already exist, that's ok
      if (!err.includes("already exists")) {
        console.error("[Deploy] GitHub repo create failed:", err);
        return NextResponse.json({ error: `GitHub repo failed: ${err}` }, { status: 500 });
      }
    }

    // ─── Step 2: Push code to GitHub ───
    console.log("[Deploy] Pushing code to GitHub...");
    
    // Clean up temp dir
    try { execSync(`rm -rf ${tmpGitDir}`); } catch {}
    
    // Clone the empty repo
    execSync(`git clone https://${GITHUB_USER}:${GITHUB_PAT}@github.com/${GITHUB_USER}/${repoName}.git ${tmpGitDir}`, {
      cwd: "/tmp",
      timeout: 30000,
    });

    // Copy project files (skip .git, node_modules)
    const copyFiles = async (src: string, dest: string) => {
      const entries = await fs.readdir(src, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "out" || entry.name === ".next") continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true });
          await copyFiles(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    };
    await copyFiles(projectDir, tmpGitDir);

    // ─── Ensure critical config files exist ───
    // Cloudflare Pages needs these to build the project
    const pkgPath = path.join(tmpGitDir, "package.json");
    const nextConfigPath = path.join(tmpGitDir, "next.config.js");
    const tsConfigPath = path.join(tmpGitDir, "tsconfig.json");

    // Check if project has Next.js structure
    const hasAppDir = (
      await fileExists(path.join(tmpGitDir, "src", "app")) ||
      await fileExists(path.join(tmpGitDir, "app"))
    );
    const hasPagesDir = (
      await fileExists(path.join(tmpGitDir, "src", "pages")) ||
      await fileExists(path.join(tmpGitDir, "pages"))
    );
    const isNextJs = hasAppDir || hasPagesDir || await fileExists(pkgPath);

    if (isNextJs) {
      // package.json
      try {
        await fs.access(pkgPath);
      } catch {
        const pkg = {
          name: repoName,
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
            "react-dom": "^19.0.0",
            "lucide-react": "^0.400.0",
            "tailwind-merge": "^2.0.0",
            "class-variance-authority": "^0.7.0",
            clsx: "^2.0.0"
          },
          devDependencies: {
            typescript: "^5.0.0",
            "@types/node": "^20.0.0",
            "@types/react": "^19.0.0",
            "@types/react-dom": "^19.0.0",
            tailwindcss: "^3.4.0",
            postcss: "^8.4.0",
            autoprefixer: "^10.4.0"
          }
        };
        await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
        console.log("[Deploy] Created package.json");
      }

      // next.config.js
      try {
        await fs.access(nextConfigPath);
      } catch {
        const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: { unoptimized: true },
};
module.exports = nextConfig;`;
        await fs.writeFile(nextConfigPath, nextConfig, "utf-8");
        console.log("[Deploy] Created next.config.js");
      }

      // tsconfig.json
      try {
        await fs.access(tsConfigPath);
      } catch {
        const hasSrc = await fileExists(path.join(tmpGitDir, "src"));
        const pathMapping = hasSrc ? "./src/*" : "./*";
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
        console.log("[Deploy] Created tsconfig.json");
      }

      // Ensure globals.css exists
      const globalsPath = path.join(tmpGitDir, "src", "app", "globals.css");
      try {
        await fs.access(globalsPath);
      } catch {
        await fs.mkdir(path.join(tmpGitDir, "src", "app"), { recursive: true });
        const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;`;
        await fs.writeFile(globalsPath, globalsCss, "utf-8");
        console.log("[Deploy] Created globals.css");
      }
    }

    // Commit and push
    execSync(`git -C ${tmpGitDir} add -A && git -C ${tmpGitDir} commit -m "Initial commit from BuildAny" && git -C ${tmpGitDir} push origin main`, {
      timeout: 30000,
      env: { ...process.env, GIT_AUTHOR_NAME: "BuildAny", GIT_AUTHOR_EMAIL: "deploy@buildany.cloud", GIT_COMMITTER_NAME: "BuildAny", GIT_COMMITTER_EMAIL: "deploy@buildany.cloud" },
    });

    // Clean up
    execSync(`rm -rf ${tmpGitDir}`);

    // ─── Step 3: Create Cloudflare Pages project ───
    console.log("[Deploy] Creating Cloudflare Pages project...");
    const cfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: repoName,
        production_branch: "main",
        source: {
          type: "github",
          config: {
            owner: GITHUB_USER,
            repo_name: repoName,
            production_branch: "main",
          },
        },
        build_config: {
          build_command: "npm run build",
          destination_dir: "out",
        },
      }),
    });

    const cfData = await cfRes.json();
    if (!cfData.success) {
      // Project might already exist
      if (!JSON.stringify(cfData).includes("already exists") && !JSON.stringify(cfData).includes("name_already_exists")) {
        console.error("[Deploy] Cloudflare Pages create failed:", JSON.stringify(cfData));
        // Return GitHub URL anyway, user can manually link
        return NextResponse.json({
          success: true,
          githubUrl: `https://github.com/${GITHUB_USER}/${repoName}`,
          message: "Code pushed to GitHub! Cloudflare Pages project needs manual setup.",
        });
      }
    }

    // ─── Step 4: Trigger first deployment ───
    console.log("[Deploy] Triggering Cloudflare deployment...");
    const deployRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${repoName}/deployments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        branch: "main",
      }),
    });

    const deployData = await deployRes.json();
    const url = `https://${repoName}.pages.dev`;

    // Update project status to deployed
    try {
      await db.update(projects)
        .set({ 
          status: "deployed", 
          updatedAt: new Date(),
          deploymentUrl: url,
        })
        .where(eq(projects.id, projectId));
      console.log("[Deploy] Project status updated to deployed:", projectId);
    } catch (dbErr) {
      console.error("[Deploy] Failed to update project status:", dbErr);
    }

    return NextResponse.json({
      success: true,
      url,
      githubUrl: `https://github.com/${GITHUB_USER}/${repoName}`,
      message: `🚀 App deployed! Live at ${url}`,
    });

  } catch (error) {
    console.error("[Deploy] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
