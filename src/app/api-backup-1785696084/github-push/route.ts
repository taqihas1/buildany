import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PROJECTS_DIR = "/data/projects";

const GITIGNORE_CONTENT = `# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Build outputs
.next/
out/
dist/
build/

# Environment variables
.env
.env.local
.env.*.local

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
`;

export async function POST(req: NextRequest) {
  try {
    const { projectId, repoName, token } = await req.json();
    if (!projectId || !repoName) {
      return NextResponse.json({ error: "projectId and repoName required" }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);
    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const githubToken = token || process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json({ 
        error: "GitHub token required. Provide it in the request or set GITHUB_TOKEN env var." 
      }, { status: 400 });
    }

    // Step 1: Create .gitignore BEFORE anything else
    const gitignorePath = path.join(projectDir, ".gitignore");
    fs.writeFileSync(gitignorePath, GITIGNORE_CONTENT, "utf-8");

    // Step 2: Remove existing .git to start fresh (avoids node_modules being tracked)
    const gitDir = path.join(projectDir, ".git");
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true });
    }

    // Step 3: Fresh git init
    execSync("git init", { cwd: projectDir });
    
    // Step 4: Add and commit .gitignore FIRST
    execSync("git add .gitignore", { cwd: projectDir });
    execSync('git commit -m "Add .gitignore"', { cwd: projectDir });
    
    // Step 5: Now add everything else (node_modules will be ignored)
    execSync("git add .", { cwd: projectDir });
    
    // Check if there are changes to commit
    const status = execSync("git status --porcelain", { cwd: projectDir, encoding: "utf-8" });
    if (status.trim()) {
      execSync('git commit -m "Initial commit from BuildAny"', { cwd: projectDir });
    }

    // Step 6: Create GitHub repo
    const createRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `token ${githubToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        name: repoName,
        private: false,
        auto_init: false,
      }),
    });

    if (!createRes.ok && createRes.status !== 422) {
      const err = await createRes.text();
      return NextResponse.json({ error: `GitHub API error: ${err}` }, { status: 500 });
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${githubToken}` },
    });
    const user = await userRes.json();
    const username = user.login;

    const repoUrl = `https://${githubToken}@github.com/${username}/${repoName}.git`;
    
    // Step 7: Push
    execSync("git branch -M main", { cwd: projectDir });
    execSync(`git remote add origin ${repoUrl}`, { cwd: projectDir });
    execSync("git push -u origin main -f", { cwd: projectDir });

    return NextResponse.json({
      success: true,
      url: `https://github.com/${username}/${repoName}`,
      message: `Pushed to https://github.com/${username}/${repoName}`,
    });
  } catch (error) {
    console.error("[GitHubPush] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
