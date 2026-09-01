/**
 * GitHub Plugin for Jason
 * Creates repos, pushes code, tracks changes
 */

const GITHUB_API = "https://api.github.com";

async function githubApi(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
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

/**
 * Create a new GitHub repository
 */
async function createRepo(params: {
  token: string;
  name: string;
  description?: string;
  private?: boolean;
}) {
  const { token, name, description = "", private: isPrivate = false } = params;

  const result = await githubApi("/user/repos", token, {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    }),
  });

  return {
    success: true,
    repoUrl: result.html_url,
    cloneUrl: result.clone_url,
    sshUrl: result.ssh_url,
    name: result.full_name,
    id: result.id,
  };
}

/**
 * Get repository contents
 */
async function getRepoContents(params: {
  token: string;
  owner: string;
  repo: string;
  path?: string;
}) {
  const { token, owner, repo, path = "" } = params;
  const data = await githubApi(`/repos/${owner}/${repo}/contents/${path}`, token);
  return Array.isArray(data) ? data : [data];
}

/**
 * Create or update a file in a repository
 */
async function pushFile(params: {
  token: string;
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch?: string;
}) {
  const { token, owner, repo, path: filePath, content, message, branch = "main" } = params;

  // Check if file exists (need sha for updates)
  let sha: string | undefined;
  try {
    const existing = await githubApi(
      `/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      token
    );
    sha = existing.sha;
  } catch {
    // File doesn't exist, that's fine
  }

  const body: any = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
  };
  if (sha) body.sha = sha;

  const result = await githubApi(
    `/repos/${owner}/${repo}/contents/${filePath}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );

  return {
    success: true,
    commit: result.commit.sha,
    url: result.content.html_url,
  };
}

/**
 * Push multiple files in a single commit
 */
async function pushFiles(params: {
  token: string;
  owner: string;
  repo: string;
  files: Array<{ path: string; content: string }>;
  message: string;
  branch?: string;
}) {
  const { token, owner, repo, files, message, branch = "main" } = params;

  // 1. Get latest commit SHA
  const ref = await githubApi(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token);
  const latestCommitSha = ref.object.sha;

  // 2. Get tree SHA from commit
  const commit = await githubApi(`/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, token);
  const baseTreeSha = commit.tree.sha;

  // 3. Create new tree with all files
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

  // 4. Create commit
  const newCommit = await githubApi(`/repos/${owner}/${repo}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: newTree.sha,
      parents: [latestCommitSha],
    }),
  });

  // 5. Update branch ref
  await githubApi(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha }),
  });

  return {
    success: true,
    commit: newCommit.sha,
    filesPushed: files.length,
  };
}

/**
 * Get latest commit info
 */
async function getLatestCommit(params: {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
}) {
  const { token, owner, repo, branch = "main" } = params;
  const commits = await githubApi(
    `/repos/${owner}/${repo}/commits?sha=${branch}&per_page=1`,
    token
  );
  const latest = commits[0];
  return {
    sha: latest.sha,
    message: latest.commit.message,
    author: latest.commit.author.name,
    date: latest.commit.author.date,
    url: latest.html_url,
  };
}

/**
 * List repository webhooks
 */
async function listWebhooks(params: { token: string; owner: string; repo: string }) {
  const { token, owner, repo } = params;
  return githubApi(`/repos/${owner}/${repo}/hooks`, token);
}

/**
 * Create a webhook for deployment tracking
 */
async function createWebhook(params: {
  token: string;
  owner: string;
  repo: string;
  url: string;
  events?: string[];
}) {
  const { token, owner, repo, url, events = ["push", "pull_request"] } = params;

  const result = await githubApi(`/repos/${owner}/${repo}/hooks`, token, {
    method: "POST",
    body: JSON.stringify({
      name: "web",
      active: true,
      events,
      config: {
        url,
        content_type: "json",
      },
    }),
  });

  return {
    id: result.id,
    url: result.url,
    active: result.active,
  };
}

// Tool interface for the agent system
async function tool(params: any) {
  const { action } = params;

  switch (action) {
    case "create_repo":
      return createRepo(params);
    case "get_contents":
      return getRepoContents(params);
    case "push_file":
      return pushFile(params);
    case "push_files":
      return pushFiles(params);
    case "get_latest_commit":
      return getLatestCommit(params);
    case "list_webhooks":
      return listWebhooks(params);
    case "create_webhook":
      return createWebhook(params);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
