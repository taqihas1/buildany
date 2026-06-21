# 🚀 Deploy BuildAny to base66.cloud

## Quick Deploy (One Command)

Copy and paste this into your VPS terminal:

```bash
# SSH to your VPS
ssh root@srv1730121

# Run deploy script
curl -fsSL https://raw.githubusercontent.com/taqihas1/buildany/main/deploy.sh | bash
```

## Manual Deploy

```bash
# 1. SSH to VPS
ssh root@2.25.170.135

# 2. Create app directory
mkdir -p /opt/buildany && cd /opt/buildany

# 3. Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# 4. Clone or copy app files
# (App files need to be copied here)

# 5. Install dependencies
npm install --legacy-peer-deps

# 6. Create .env.local
cat > .env.local << 'ENV'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bm90ZWQtbmFyd2hhbC05OC5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_Vg2LoqrRabVR7r4vUHleWCyqpXFT7h7NI0NyM3dpqe
DEEPSEEK_API_KEY=Sk-05d9bec6c9e8467b9ba95294add38a8e
DATABASE_URL=./sqlite.db
ENV

# 7. Build
npm run build

# 8. Install PM2
npm install -g pm2

# 9. Start app
pm2 start npm --name "buildany" -- start

# 10. Save config
pm2 save
pm2 startup systemd -u root --hp /root
```

## Nginx Setup (for base66.cloud)

```bash
# Install nginx
apt-get install -y nginx

# Create config
cat > /etc/nginx/sites-available/buildany << 'NGINX'
server {
    listen 80;
    server_name base66.cloud www.base66.cloud;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name base66.cloud www.base66.cloud;

    ssl_certificate /etc/letsencrypt/live/base66.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/base66.cloud/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/buildany /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

## Check Status

```bash
# App logs
pm2 logs buildany

# App status
pm2 status

# Restart
pm2 restart buildany
```

## API Keys (Already Set)

| Key | Status |
|-----|--------|
| DEEPSEEK_API_KEY | ✅ Set |
| CLERK_PUBLISHABLE_KEY | ✅ Set |
| CLERK_SECRET_KEY | ✅ Set |
| GITHUB_TOKEN | ⏳ Add later |
