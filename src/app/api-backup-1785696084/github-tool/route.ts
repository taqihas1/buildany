import { NextRequest, NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

async function githubApi(path: string, opts: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const { action, ...args } = await req.json();
    let result: any;

    switch (action) {
      case "create_repo": {
        result = await githubApi("/user/repos", {
          method: "POST",
          body: JSON.stringify({ name: args.name, private: args.private ?? false, description: args.description || "" }),
        });
        break;
      }
      case "push_changes": {
        result = await githubApi(`/repos/${args.owner}/${args.repo}/git/refs/heads/main`, { method: "GET" });
        break;
      }
      case "create_pull_request": {
        result = await githubApi(`/repos/${args.owner}/${args.repo}/pulls`, {
          method: "POST",
          body: JSON.stringify({ title: args.title, head: args.head, base: args.base || "main", body: args.body || "" }),
        });
        break;
      }
      case "get_repo_files": {
        result = await githubApi(`/repos/${args.owner}/${args.repo}/contents/${args.path || ""}`);
        break;
      }
      case "get_file_content": {
        const data = await githubApi(`/repos/${args.owner}/${args.repo}/contents/${args.path}`);
        result = { content: Buffer.from(data.content, "base64").toString("utf-8"), sha: data.sha };
        break;
      }
      case "update_file": {
        const current = await githubApi(`/repos/${args.owner}/${args.repo}/contents/${args.path}`);
        result = await githubApi(`/repos/${args.owner}/${args.repo}/contents/${args.path}`, {
          method: "PUT",
          body: JSON.stringify({ message: args.message, content: Buffer.from(args.content).toString("base64"), sha: current.sha }),
        });
        break;
      }
      case "check_workflows": {
        result = await githubApi(`/repos/${args.owner}/${args.repo}/actions/runs`);
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", connector: "github", actions: ["create_repo", "push_changes", "create_pull_request", "get_repo_files", "get_file_content", "update_file", "check_workflows"] });
}
