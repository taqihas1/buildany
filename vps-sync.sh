#!/bin/bash
# VPS Sync Script - One-command deploy for BuildAny
# Usage: cd /root/buildany && bash vps-sync.sh

set -e

echo "🔄 BuildAny VPS Sync"
echo "====================="

# Pull latest code
echo "📥 Pulling latest code..."
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

# Build
echo "🔨 Building..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Restart PM2 process
echo "🔄 Restarting PM2 process..."
pm2 restart 0 --update-env
if [ $? -ne 0 ]; then
    echo "❌ PM2 restart failed"
    exit 1
fi

# Save PM2 config
pm2 save

echo "✅ Done! BuildAny updated and restarted."
echo "🌐 https://base66.cloud"
