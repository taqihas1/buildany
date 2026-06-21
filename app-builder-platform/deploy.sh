#!/bin/bash
# Deploy BuildAny to base66.cloud
# Run this on your VPS (srv1730121)

set -e

APP_DIR="/opt/buildany"
REPO_URL="https://github.com/taqihas1/buildany.git"
NODE_VERSION="22"

echo "🚀 Deploying BuildAny to base66.cloud..."

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi

# Create app directory
mkdir -p ${APP_DIR}
cd ${APP_DIR}

# If repo exists, pull; else clone
if [ -d ".git" ]; then
    echo "Pulling latest code..."
    git pull origin main
else
    echo "Cloning repository..."
    git clone ${REPO_URL} .
fi

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Create .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bm90ZWQtbmFyd2hhbC05OC5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_Vg2LoqrRabVR7r4vUHleWCyqpXFT7h7NI0NyM3dpqe
DEEPSEEK_API_KEY=Sk-05d9bec6c9e8467b9ba95294add38a8e
DATABASE_URL=./sqlite.db
EOF

# Build
echo "Building application..."
npm run build

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Stop existing app if running
pm2 stop buildany 2>/dev/null || true

# Start with PM2
pm2 start npm --name "buildany" -- start

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup systemd -u root --hp /root

echo "✅ BuildAny deployed!"
echo "🌐 https://base66.cloud"
echo "📊 Check status: pm2 logs buildany"
