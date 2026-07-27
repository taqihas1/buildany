module.exports = {
  apps: [{
    name: buildany,
    script: npm,
    args: start,
    cwd: /root/buildany,
    env: {
      NODE_ENV: production,
      PORT: 3000,
      CLOUDFLARE_API_TOKEN: ,
      CLOUDFLARE_ACCOUNT_ID: ,
      GITHUB_TOKEN: 
    },
    log_file: /root/.pm2/logs/buildany-combined.log,
    out_file: /root/.pm2/logs/buildany-out.log,
    error_file: /root/.pm2/logs/buildany-error.log,
    merge_logs: true,
    time: true
  }]
};
