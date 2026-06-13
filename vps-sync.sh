#!/bin/bash
# BuildAny VPS Sync Script
# Pulls latest changes from GitHub and rebuilds

echo "🚀 BuildAny VPS Sync Script"
echo "=========================="

# Go to project directory
cd /root/buildany || { echo "❌ Failed to cd to /root/buildany"; exit 1; }

# Pull latest changes from GitHub (main branch)
echo "📥 Pulling latest changes from GitHub..."
git fetch origin main
git reset --hard origin/main
if [ $? -ne 0 ]; then
    echo "❌ Git pull failed"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi

# Build the project
echo "🔨 Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Restart PM2 process
echo "🔄 Restarting PM2 process..."
pm2 restart buildany-3001 --update-env
if [ $? -ne 0 ]; then
    echo "❌ PM2 restart failed"
    exit 1
fi

# Check status
echo "✅ Sync complete! Checking status..."
pm2 status buildany

echo ""
echo "🌐 BuildAny should be live at: https://base66.cloud"
