async function tool(params) {
  const {
    cloudflareAccountId,
    cloudflareApiToken,
    deploymentId,
    githubRepo,
    githubToken,
    branch = 'main'
  } = params;

  try {
    // 1. Check deployment status
    const statusRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/${deploymentId}/deployments`,
      { headers: { Authorization: `Bearer ${cloudflareApiToken}` } }
    );
    const statusData = await statusRes.json();
    const deployment = statusData.result?.[0];

    if (!deployment) {
      return { success: false, error: 'Deployment not found' };
    }

    if (deployment.status === 'success') {
      return { success: true, status: 'success', message: 'Deployment is healthy' };
    }

    // 2. Fetch deployment logs on failure
    const logsRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/${deploymentId}/deployments/${deployment.id}/history/logs`,
      { headers: { Authorization: `Bearer ${cloudflareApiToken}` } }
    );
    const logsData = await logsRes.json();
    const logs = logsData.result?.map(l => l.line).join('\n') || 'No logs available';

    // 3. Identify common errors
    const errorPatterns = [
      { pattern: /Cannot find module/i, fix: 'Missing dependency — run npm install and commit package-lock.json' },
      { pattern: /SyntaxError/i, fix: 'Syntax error — check the referenced file for typos' },
      { pattern: /TypeError/i, fix: 'Type error — verify variable types and null checks' },
      { pattern: /Module not found/i, fix: 'Import path incorrect — verify file paths' },
      { pattern: /ReferenceError/i, fix: 'Undefined variable — declare before use' }
    ];

    const detected = errorPatterns.find(p => p.pattern.test(logs));
    const fixMessage = detected ? detected.fix : 'Unknown error — review logs manually';

    // 4. Push fix to GitHub (create issue with diagnosis)
    const issueRes = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `[Auto-Fix] Deployment failed: ${deployment.id}`,
        body: `**Error detected:**\n\n${fixMessage}\n\n**Logs:**\n\n\`\`\`\n${logs.slice(0, 2000)}\n\`\`\``,
        labels: ['auto-fix', 'deployment']
      })
    });

    if (!issueRes.ok) {
      return { success: false, status: 'failed', error: 'Failed to create GitHub issue', logs };
    }

    return {
      success: true,
      status: 'failed',
      error: fixMessage,
      logs,
      githubIssueCreated: true
    };
  } catch (error) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}