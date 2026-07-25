import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

/**
 * GITHUB TOOL
 *
 * Operations:
 * - create_repo(name, description, private) → Create GitHub repo
 * - push_changes(project_id, message) → Commit and push project
 * - create_pull_request(title, body, branch) → Open PR
 * - get_repo_files(owner, repo, path) → List files
 * - get_file_content(owner, repo, path) → Read file
 * - update_file(owner, repo, path, content, message) → Update file
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_API = "https://api.github.com";

export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json();
    
    if (!GITHUB_TOKEN) {
      return NextResponse.json(
        { error: "GITHUB_TOKEN not configured" },
        { status: 500 }
      );
    }

    let result;
    switch (action) {
      case "create_repo":
        result = await createRepo(params);
        break;
      case "push_changes":
        result = await pushChanges(params);
        break;
      case "create_pull_request":
        result = await createPullRequest(params);
        break;
      case "get_repo_files":
        result = await getRepoFiles(params);
        break;
      case "get_file_content":
        result = await getFileContent(params);
        break;
      case "update_file":
        result = await updateFile(params);
        break;
      case "check_workflows":
        result = await checkWorkflows(params);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: "GitHub tool error", details: e.message },
      { status: 500 }
    );
  }
}

async function createRepo({ name, description = "", private_repo = true }: any) {
  const res = await fetch(`${GITHUB_API}/user/repos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      name,
      description,
      private: private_repo,
      auto_init: true,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create repo");

  return {
    success: true,
    repo_url: data.html_url,
    clone_url: data.clone_url,
    ssh_url: data.ssh_url,
    name: data.name,
  };
}

async function pushChanges({ project_id, message = "Update from Kelly" }: any) {
  const PROJECTS_DIR = process.env.PROJECTS_DIR || "/root/buildany/projects";
  const projectPath = path.join(PROJECTS_DIR, project_id);

  // Check if git initialized
  const gitDir = path.join(projectPath, ".git");
  try {
    await fs.access(gitDir);
  } catch {
    // Init git
    await execAsync("git init", { cwd: projectPath });
    await execAsync("git branch -M main", { cwd: projectPath });
  }

  // Check if remote exists
  const { stdout: remotes } = await execAsync("git remote -v", { cwd: projectPath }).catch(() => ({ stdout: "" }));
  
  if (!remotes.includes("origin")) {
    // Need to set up remote - get from .buildany.json
    const metaPath = path.join(projectPath, ".buildany.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    if (meta.github_repo) {
      await execAsync(`git remote add origin ${meta.github_repo}`, { cwd: projectPath });
    } else {
      throw new Error("No GitHub repo configured. Run create_repo first.");
    }
  }

  // Configure git user if not set
  await execAsync("git config user.email 'kelly@buildany.ai' || true", { cwd: projectPath });
  await execAsync("git config user.name 'Kelly AI' || true", { cwd: projectPath });

  // Add, commit, push
  await execAsync("git add -A", { cwd: projectPath });
  await execAsync(`git commit -m "${message}" || true`, { cwd: projectPath });
  
  // Try SSH first, fallback to HTTPS with token
  try {
    await execAsync("git push -u origin main", { cwd: projectPath });
  } catch {
    // Fallback: use token-based HTTPS
    const { stdout: remotes2 } = await execAsync("git remote get-url origin", { cwd: projectPath });
    const repoUrl = remotes2.trim();
    const tokenUrl = repoUrl.replace("https://", `https://${GITHUB_TOKEN}@`);
    await execAsync(`git push ${tokenUrl} main`, { cwd: projectPath });
  }

  return { success: true, message: "Changes pushed to GitHub" };
}

async function createPullRequest({ owner, repo, title, body = "", head = "main", base = "main" }: any) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body: JSON.stringify({ title, body, head, base }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create PR");

  return {
    success: true,
    pr_url: data.html_url,
    pr_number: data.number,
  };
}

async function getRepoFiles({ owner, repo, path: filePath = "" }: any) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to get files");

  if (Array.isArray(data)) {
    return { files: data.map((f: any) => ({ name: f.name, type: f.type, path: f.path })) };
  } else {
    return { content: Buffer.from(data.content, "base64").toString("utf-8") };
  }
}

async function getFileContent({ owner, repo, path: filePath }: any) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to get file");

  return {
    content: Buffer.from(data.content, "base64").toString("utf-8"),
    sha: data.sha,
  };
}

async function updateFile({ owner, repo, path: filePath, content, message, sha }: any) {
  const encodedContent = Buffer.from(content).toString("base64");
  
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      message,
      content: encodedContent,
      sha,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update file");

  return { success: true, commit: data.commit?.sha };
}

async function checkWorkflows({ owner, repo }: any) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/actions/runs`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to get workflows");

  return {
    total: data.total_count,
    runs: data.workflow_runs?.map((run: any) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
    })) || [],
  };
}
