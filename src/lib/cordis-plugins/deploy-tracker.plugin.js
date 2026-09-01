---
id: deploy-tracker
name: deploy-tracker
version: 1.0.0
description: Track Cloudflare deployment status
plane: agent
inject: tools
---

// Plugin: deploy-tracker
// Automatically created by Jason to track deployments

function apply(ctx) {
  const tools = ctx.get('tools');
  
  tools.register('check_deploy_status', {
    name: 'check_deploy_status',
    description: 'Check if a Cloudflare Pages deployment is live',
    parameters: {
      url: { type: 'string', description: 'Deployment URL to check' }
    },
    execute: async (params) => {
      const res = await fetch(params.url, { method: 'HEAD' });
      return {
        status: res.status,
        isLive: res.status === 200,
        headers: Object.fromEntries(res.headers.entries())
      };
    }
  });
  
  console.log('[deploy-tracker] Registered check_deploy_status tool');
}

if (typeof apply !== 'undefined') {
  apply;
}
