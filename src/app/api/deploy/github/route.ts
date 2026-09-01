import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, projectFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { startDeploymentMonitor } from "@/lib/deployment-monitor";

const PROJECTS_DIR = "/data/projects";

/**
 * POST /api/deploy/github
 * Full pipeline: Push to GitHub → Cloudflare auto-deploys
 * Body: { projectId: string, githubToken: string, repoName?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, githubToken, repoName } = await req.json();

    if (!projectId || !githubToken) {
      return NextResponse.json(
        { error: "projectId and githubToken required" },
        { status: 400 }
      );
    }

    // 1. Get project info
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Get all project files from DB
    const files = await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId));

    // 3. Check if repo exists, create if not
    const repo = repoName || project.name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-app";
    const repoFullName = await getOrCreateRepo(githubToken, repo, project.description || "");

    // 4. Push all files to GitHub
    const pushResult = await pushFilesToGitHub(
      githubToken,
      repoFullName,
      files.map((f) => ({ path: f.path, content: f.content }))
    );

    // 5. Update project with GitHub info
    await db
      .update(projects)
      .set({
        githubRepo: repoFullName,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // 6. Start deployment monitoring (auto-fix on failure)
    const repoParts = repoFullName.split("/");
    if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
      startDeploymentMonitor({
        projectId,
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        projectName: repoParts[1] || repoParts[0],
        githubOwner: repoParts[0],
        githubRepo: repoParts[1] || repoParts[0],
        cloudflareToken: process.env.CLOUDFLARE_API_TOKEN,
        githubToken,
      });
    }

    return NextResponse.json({
      success: true,
      repo: repoFullName,
      url: `https://github.com/${repoFullName}`,
      commit: pushResult.commit,
      filesPushed: pushResult.filesPushed,
      message: `Code pushed to GitHub! Cloudflare will auto-deploy from: https://github.com/${repoFullName}`,
    });
  } catch (err: any) {
    console.error("[Deploy GitHub] Error:", err);
    return NextResponse.json(
      { error: err.message || "Deploy failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deploy/github/status?repo=owner/name
 * Check GitHub repo + Cloudflare deployment status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repo = searchParams.get("repo");
    const githubToken = searchParams.get("token");

    if (!repo || !githubToken) {
      return NextResponse.json(
        { error: "repo and token required" },
        { status: 400 }
      );
    }

    // Get latest commit from GitHub
    const commits = await githubApi(`/repos/${repo}/commits?per_page=1`, githubToken);
    const latest = commits[0];

    return NextResponse.json({
      success: true,
      repo,
      latestCommit: {
        sha: latest.sha.slice(0, 7),
        message: latest.commit.message,
        author: latest.commit.author.name,
        date: latest.commit.author.date,
      },
      cloudflareNote:
        "If Cloudflare Pages is connected, it will auto-deploy on every push.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── GitHub API Helpers ───

async function githubApi(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API ${res.status}: ${err}`);
  }

  return res.json();
}

async function getOrCreateRepo(token: string, name: string, description: string): Promise<string> {
  // Try to get existing repo
  try {
    const user = await githubApi("/user", token);
    const repo = await githubApi(`/repos/${user.login}/${name}`, token);
    return repo.full_name;
  } catch {
    // Create new repo
    const user = await githubApi("/user", token);
    const repo = await githubApi("/user/repos", token, {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        private: false,
        auto_init: true,
      }),
    });
    return repo.full_name;
  }
}

async function pushFilesToGitHub(
  token: string,
  repoFullName: string,
  files: Array<{ path: string; content: string }>
) {
  const [owner, repo] = repoFullName.split("/");

  // Get latest commit
  const ref = await githubApi(`/repos/${owner}/${repo}/git/refs/heads/main`, token);
  const latestCommitSha = ref.object.sha;

  // Get tree
  const commit = await githubApi(`/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, token);
  const baseTreeSha = commit.tree.sha;

  // Create new tree
  const tree = files.map((f) => ({
    path: f.path,
    mode: "100644" as const,
    type: "blob" as const,
    content: f.content,
  }));

  const newTree = await githubApi(`/repos/${owner}/${repo}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree }),
  });

  // Create commit
  const newCommit = await githubApi(`/repos/${owner}/${repo}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({
      message: "Update from BuildAny",
      tree: newTree.sha,
      parents: [latestCommitSha],
    }),
  });

  // Update branch
  await githubApi(`/repos/${owner}/${repo}/git/refs/heads/main`, token, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha }),
  });

  return {
    commit: newCommit.sha,
    filesPushed: files.length,
  };
}
