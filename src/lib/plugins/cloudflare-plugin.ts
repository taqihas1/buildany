/**
 * Cloudflare Pages Deployment Tracker
 * Monitors deployment status, gets build logs, manages DNS
 */

const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";

async function cfApi(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${CLOUDFLARE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
  }
  return data.result;
}

/**
 * List deployments for a project
 */
async function listDeployments(params: {
  token: string;
  accountId: string;
  projectName: string;
}) {
  const { token, accountId, projectName } = params;
  return cfApi(
    `/accounts/${accountId}/pages/projects/${projectName}/deployments`,
    token
  );
}

/**
 * Get specific deployment details
 */
async function getDeployment(params: {
  token: string;
  accountId: string;
  projectName: string;
  deploymentId: string;
}) {
  const { token, accountId, projectName, deploymentId } = params;
  return cfApi(
    `/accounts/${accountId}/pages/projects/${projectName}/deployments/${deploymentId}`,
    token
  );
}

/**
 * Get deployment logs
 */
async function getDeploymentLogs(params: {
  token: string;
  accountId: string;
  projectName: string;
  deploymentId: string;
}) {
  const { token, accountId, projectName, deploymentId } = params;
  return cfApi(
    `/accounts/${accountId}/pages/projects/${projectName}/deployments/${deploymentId}/history/logs`,
    token
  );
}

/**
 * Retry a failed deployment
 */
async function retryDeployment(params: {
  token: string;
  accountId: string;
  projectName: string;
  deploymentId: string;
}) {
  const { token, accountId, projectName, deploymentId } = params;
  return cfApi(
    `/accounts/${accountId}/pages/projects/${projectName}/deployments/${deploymentId}/retry`,
    token,
    { method: "POST" }
  );
}

/**
 * Get project info
 */
async function getProject(params: {
  token: string;
  accountId: string;
  projectName: string;
}) {
  const { token, accountId, projectName } = params;
  return cfApi(
    `/accounts/${accountId}/pages/projects/${projectName}`,
    token
  );
}

/**
 * Check if deployment is live and working
 */
async function checkDeploymentHealth(params: {
  url: string;
}) {
  const { url } = params;
  const start = Date.now();
  const res = await fetch(url, { method: "HEAD" });
  return {
    status: res.status,
    statusText: res.statusText,
    responseTime: Date.now() - start,
    isLive: res.status === 200,
    headers: Object.fromEntries(res.headers.entries()),
  };
}

// Tool interface
async function tool(params: any) {
  const { action } = params;

  switch (action) {
    case "list_deployments":
      return listDeployments(params);
    case "get_deployment":
      return getDeployment(params);
    case "get_logs":
      return getDeploymentLogs(params);
    case "retry":
      return retryDeployment(params);
    case "get_project":
      return getProject(params);
    case "check_health":
      return checkDeploymentHealth(params);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
