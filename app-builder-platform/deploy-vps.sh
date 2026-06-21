#!/bin/bash
# BuildAny VPS Deploy Script
# Run this on your VPS to deploy the latest BuildAny code

set -e

REPO_DIR="/opt/buildany"
BACKUP_DIR="/opt/buildany-backup-$(date +%Y%m%d-%H%M%S)"
APP_NAME="buildany"

echo "🚀 BuildAny VPS Deploy Script"
echo "=============================="

# Step 1: Check if directory exists
if [ ! -d "$REPO_DIR" ]; then
    echo "❌ Directory $REPO_DIR not found!"
    echo "Please clone the repo first:"
    echo "  git clone https://github.com/taqihas1/buildany.git /opt/buildany"
    exit 1
fi

cd "$REPO_DIR"

# Step 2: Backup current build
echo "📦 Creating backup at $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
if [ -d ".next" ]; then
    cp -r .next "$BACKUP_DIR/"
fi
cp package.json package-lock.json "$BACKUP_DIR/" 2>/dev/null || true

# Step 3: Pull latest code from GitHub
echo "📥 Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

# Step 4: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 5: Check environment variables
echo "🔍 Checking environment variables..."
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found! Creating from template..."
    cat > .env.local << 'EOF'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bm90ZWQtbmFyd2hhbC05OC5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_Vg2LoqrRabVR7r4vUHleWCyqpXFT7h7NI0NyM3dpqe
DEEPSEEK_API_KEY=Sk-05d9bec6c9e8467b9ba95294add38a8e
DATABASE_URL=./sqlite.db
GITHUB_TOKEN=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
RESEND_API_KEY=re_8a5SS6ZU_HqBGRzH3pirjAKrHSj1vynxf
EOF
    echo "✅ Created .env.local with API keys"
fi

# Step 6: Build the application
echo "🔨 Building the application..."
npm run build

# Step 7: Restart PM2 process
echo "🔄 Restarting PM2 process..."
pm2 restart "$APP_NAME" || pm2 start npm --name "$APP_NAME" -- start

# Step 8: Verify deployment
echo "✅ Verifying deployment..."
sleep 2
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

echo ""
echo "=============================="
echo "🎉 Deploy complete!"
echo "🌐 Website: https://base66.cloud"
echo "📊 PM2 status:"
pm2 status "$APP_NAME"
