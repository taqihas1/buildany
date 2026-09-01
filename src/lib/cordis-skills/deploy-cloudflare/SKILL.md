---
name: deploy-cloudflare
description: Deploy a Next.js app to Cloudflare Pages
whenToUse: When the user wants to deploy their app or check deployment status
---

# Deploy to Cloudflare Pages

## Steps

1. Ensure `next.config.js` has:
   ```js
   module.exports = {
     output: 'export',
     distDir: 'out',
   };
   ```

2. Push code to GitHub
3. Connect repository to Cloudflare Pages
4. Set build command: `npm run build`
5. Set build output: `out`

## Checking Status

Use the `check_deploy_status` tool with the deployment URL.

## Troubleshooting

- If build fails, check that all imports resolve
- Ensure no server-side APIs in exported pages
- Verify `next.config.js` is correct
