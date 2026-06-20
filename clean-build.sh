#!/bin/bash
# BuildAny Clean Build Script
# Usage: ./clean-build.sh

set -e

echo "🧹 Cleaning caches..."
cd /root/buildany
rm -rf .next .turbo node_modules/.cache

echo "🏗️  Building..."
npm run build

echo "🚀 Restarting PM2..."
pm2 restart buildany

echo "✅ Done! Checking status..."
pm2 show buildany | grep -E "status|uptime|memory"
echo ""
echo "📊 Recent logs:"
pm2 logs buildany --lines 3 --raw
