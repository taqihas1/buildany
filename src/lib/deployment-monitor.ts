/**
 * Deployment Monitor — Autonomous Cloudflare deployment tracking + auto-fix
 * 
 * Flow:
 * 1. User deploys → monitor starts polling Cloudflare
 * 2. If SUCCESS → writes "✅ Deployment successful" to chat
 * 3. If FAILED → fetches logs → analyzes → generates fix → pushes to GitHub → writes status to chat
 */

import { db } from "@/lib/db";
import { conversations, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { fetchBuildLogs, analyzeBuildLogs, pushFixToGitHub } from "@/lib/build-analyzer";

interface MonitorConfig {
  projectId: string;
  accountId: string;
  projectName: string; // Cloudflare Pages project name
  githubOwner: string;
  githubRepo: string;
  cloudflareToken: string;
  githubToken: string;
  deploymentId?: string;
}

interface DeploymentStatus {
  id: string;
  url: string;
  environment: string;
  stage: "building" | "built" | "success" | "failed";
  created_on: string;
}

// Active monitors (in-memory for now; could use Redis for multi-instance)
const activeMonitors = new Map<string, NodeJS.Timeout>();

/**
 * Start monitoring a Cloudflare deployment
 */
export async function startDeploymentMonitor(config: MonitorConfig): Promise<void> {
  const { projectId } = config;

  // Stop existing monitor for this project
  stopDeploymentMonitor(projectId);

  console.log(`[DeployMonitor] Starting monitor for project ${projectId}`);

  // Write initial status to chat
  await addChatMessage(projectId, "assistant", "🚀 Deployment started! Monitoring Cloudflare build status...");

  // Start polling
  const interval = setInterval(async () => {
    await pollDeploymentStatus(config);
  }, 15000); // Check every 15 seconds

  activeMonitors.set(projectId, interval);

  // Also run immediately
  await pollDeploymentStatus(config);
}

/**
 * Stop monitoring a project
 */
export function stopDeploymentMonitor(projectId: string): void {
  const existing = activeMonitors.get(projectId);
  if (existing) {
    clearInterval(existing);
    activeMonitors.delete(projectId);
    console.log(`[DeployMonitor] Stopped monitor for project ${projectId}`);
  }
}

/**
 * Poll Cloudflare for deployment status
 */
async function pollDeploymentStatus(config: MonitorConfig): Promise<void> {
  try {
    const { projectId, accountId, projectName, cloudflareToken } = config;

    // Fetch latest deployment
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`,
      {
        headers: {
          Authorization: `Bearer ${cloudflareToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();
    if (!data.success || !data.result?.length) {
      console.log(`[DeployMonitor] No deployments found for ${projectName}`);
      return;
    }

    const latest: DeploymentStatus = data.result[0];
    const stage = latest.stage;

    console.log(`[DeployMonitor] Project ${projectId} stage: ${stage}`);

    if (stage === "success") {
      // ✅ SUCCESS
      await handleDeploySuccess(config, latest);
    } else if (stage === "failed") {
      // ❌ FAILED — trigger auto-fix
      await handleDeployFailure(config, latest);
    }
    // If "building" or "built", keep polling

  } catch (err: any) {
    console.error(`[DeployMonitor] Poll error:`, err.message);
  }
}

/**
 * Handle successful deployment
 */
async function handleDeploySuccess(config: MonitorConfig, deployment: DeploymentStatus): Promise<void> {
  const { projectId } = config;

  // Stop monitoring
  stopDeploymentMonitor(projectId);

  // Update project status in DB
  await db.update(projects)
    .set({ status: "deployed" })
    .where(eq(projects.id, projectId));

  // Write success to chat
  await addChatMessage(
    projectId,
    "assistant",
    `✅ **Deployment successful!**\n\nYour app is live at: ${deployment.url}\n\nCloudflare Pages project: ${config.projectName}`
  );

  console.log(`[DeployMonitor] ✅ Project ${projectId} deployed successfully to ${deployment.url}`);
}

/**
 * Handle failed deployment — AUTO-FIX PIPELINE
 */
async function handleDeployFailure(config: MonitorConfig, deployment: DeploymentStatus): Promise<void> {
  const { projectId, accountId, projectName, githubOwner, githubRepo, cloudflareToken, githubToken } = config;

  console.log(`[DeployMonitor] ❌ Project ${projectId} deployment failed. Starting auto-fix...`);

  // Write failure notice to chat
  await addChatMessage(
    projectId,
    "assistant",
    `❌ **Deployment failed!**\n\nBuild status: FAILED\nAuto-fix pipeline starting...`
  );

  try {
    // 1. Fetch build logs
    const logsResult = await fetchBuildLogs(accountId, projectName, cloudflareToken, deployment.id);
    if (!logsResult.success || !logsResult.logs) {
      await addChatMessage(projectId, "assistant", `⚠️ Could not fetch build logs: ${logsResult.error}`);
      return;
    }

    // 2. Analyze logs
    const failures = analyzeBuildLogs(logsResult.logs);
    if (failures.length === 0) {
      await addChatMessage(projectId, "assistant", "⚠️ Build failed but no specific errors detected in logs.");
      return;
    }

    // 3. Report found errors
    const errorSummary = failures.map(f => `- ${f.error.slice(0, 100)}...`).join("\n");
    await addChatMessage(
      projectId,
      "assistant",
      `🔍 **Found ${failures.length} error(s):**\n${errorSummary}\n\nGenerating fixes...`
    );

    // 4. Fix each failure
    const fixes: string[] = [];
    for (const failure of failures) {
      const fixResult = await generateFixForFailure(failure, githubOwner, githubRepo, githubToken);
      fixes.push(fixResult);
    }

    // 5. Report fixes pushed
    const fixSummary = fixes.join("\n");
    await addChatMessage(
      projectId,
      "assistant",
      `🔧 **Auto-fixes pushed to GitHub:**\n${fixSummary}\n\nCloudflare will auto-redeploy in a few minutes. I'll keep monitoring...`
    );

    // 6. Restart monitoring (Cloudflare will rebuild from GitHub push)
    // The monitor is still running, so next poll will check the new deployment

  } catch (err: any) {
    console.error(`[DeployMonitor] Auto-fix error:`, err);
    await addChatMessage(projectId, "assistant", `❌ Auto-fix failed: ${err.message}`);
  }
}

/**
 * Generate and push fix for a specific failure
 */
async function generateFixForFailure(
  failure: { error: string; category: string; suggestion: string; file?: string },
  owner: string,
  repo: string,
  githubToken: string
): Promise<string> {
  try {
    // For dependency errors, fix package.json
    if (failure.category === "dependency") {
      // Fetch current package.json
      const getRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      const fileData = await getRes.json();
      const content = Buffer.from(fileData.content, "base64").toString("utf-8");
      const pkg = JSON.parse(content);

      // Try to fix the dependency
      const match = failure.error.match(/No matching version found for ([^@]+)/);
      if (match) {
        const packageName = match[1];
        // Update to latest version (simplified — in production would query npm registry)
        if (pkg.dependencies?.[packageName]) {
          pkg.dependencies[packageName] = "latest";
        } else if (pkg.devDependencies?.[packageName]) {
          pkg.devDependencies[packageName] = "latest";
        }

        // Push fix
        const pushResult = await pushFixToGitHub(
          owner,
          repo,
          "package.json",
          JSON.stringify(pkg, null, 2),
          githubToken,
          `fix: resolve ${packageName} version mismatch`
        );

        if (pushResult.success) {
          return `✅ Fixed dependency: ${packageName} (commit: ${pushResult.commit?.slice(0, 7)})`;
        }
      }
    }

    // For syntax errors, try to fix the specific file
    if (failure.category === "syntax" && failure.file) {
      return `💡 Syntax error in ${failure.file}: ${failure.suggestion} (manual fix needed)`;
    }

    return `⚠️ Could not auto-fix: ${failure.error.slice(0, 60)}...`;
  } catch (err: any) {
    return `❌ Fix failed: ${err.message}`;
  }
}

/**
 * Add a message to the project's chat history
 */
async function addChatMessage(
  projectId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  try {
    await db.insert(conversations).values({
      id: randomUUID(),
      projectId,
      role,
      content,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[DeployMonitor] Failed to add chat message:", err);
  }
}

/**
 * Check if a monitor is active for a project
 */
export function isMonitoring(projectId: string): boolean {
  return activeMonitors.has(projectId);
}
