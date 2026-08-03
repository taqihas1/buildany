module.exports = {
  apps: [{
    name: 'buildany',
    cwd: '/root/buildany',
    script: 'node_modules/.bin/next',
    args: 'start',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/root/.pm2/logs/buildany-error.log',
    out_file: '/root/.pm2/logs/buildany-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
