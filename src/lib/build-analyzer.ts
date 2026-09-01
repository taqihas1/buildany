/**
 * Cloudflare Build Log Analyzer + Auto-Fixer
 * Pre-built tool for analyzing Cloudflare Pages build failures
 */

import { callModel } from "@/lib/ai-client";

interface BuildLogEntry {
  timestamp: string;
  message: string;
  level: "info" | "error" | "warning";
}

interface BuildFailure {
  error: string;
  category: "dependency" | "syntax" | "config" | "other";
  file?: string;
  suggestion: string;
}

export async function fetchBuildLogs(
  accountId: string,
  projectName: string,
  apiToken: string,
  deploymentId?: string
): Promise<{ success: boolean; logs?: BuildLogEntry[]; error?: string }> {
  try {
    const deploymentsRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const deploymentsData = await deploymentsRes.json();
    if (!deploymentsData.success || !deploymentsData.result?.length) {
      return { success: false, error: "No deployments found" };
    }

    const targetDeployment = deploymentId || deploymentsData.result[0].id;

    const logsRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments/${targetDeployment}/history`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const logsData = await logsRes.json();
    if (!logsData.success) {
      return { success: false, error: logsData.errors?.[0]?.message || "Failed to fetch logs" };
    }

    const logs: BuildLogEntry[] = [];
    for (const entry of logsData.result || []) {
      logs.push({
        timestamp: entry.ts || new Date().toISOString(),
        message: entry.line || "",
        level: entry.error ? "error" : "info",
      });
    }

    return { success: true, logs };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function analyzeBuildLogs(logs: BuildLogEntry[]): BuildFailure[] {
  const failures: BuildFailure[] = [];

  for (const log of logs) {
    const msg = log.message;

    if (msg.includes("No matching version found for")) {
      const match = msg.match(/No matching version found for ([^@]+)@([^\s]+)/);
      if (match) {
        failures.push({
          error: msg,
          category: "dependency",
          suggestion: `Update package: npm install ${match[1]}@latest`,
        });
      }
    }

    if (msg.includes("npm error code ETARGET")) {
      failures.push({
        error: "Dependency version mismatch",
        category: "dependency",
        suggestion: "Check package.json for invalid version constraints",
      });
    }

    if (msg.includes("SyntaxError") || msg.includes("Unexpected token")) {
      const fileMatch = msg.match(/in (.+?):\d+/);
      failures.push({
        error: msg,
        category: "syntax",
        file: fileMatch ? fileMatch[1] : undefined,
        suggestion: "Check for syntax errors in the file",
      });
    }

    if (msg.includes("No Wrangler configuration file found")) {
      failures.push({
        error: "Missing wrangler.toml",
        category: "config",
        suggestion: "Add wrangler.toml or next.config.js with output: 'export'",
      });
    }
  }

  return failures;
}

export async function pushFixToGitHub(
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  githubToken: string,
  message: string = "fix: auto-fix from BuildAny"
): Promise<{ success: boolean; commit?: string; error?: string }> {
  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    const fileData = await getRes.json();
    const sha = fileData.sha;

    const updateRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message,
          content: Buffer.from(content).toString("base64"),
          sha,
        }),
      }
    );

    const updateData = await updateRes.json();
    if (updateData.commit) {
      return { success: true, commit: updateData.commit.sha };
    }

    return { success: false, error: updateData.message || "Failed to push fix" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
