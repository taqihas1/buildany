#!/bin/bash
cd /root/buildany

echo "🔥 Building Kelly ARD Code Review System..."

# Rebuild
rm -rf .next && npm run build

# Restart
pm2 restart buildany

sleep 3

echo ""
echo "=== Testing ARD Catalog ==="
curl -s https://base66.cloud/.well-known/ai-catalog.json | head -20

echo ""
echo "=== Testing Kelly ARD Discovery ==="
curl -s https://base66.cloud/api/ard-discover | head -30

echo ""
echo "=== Testing Kelly Code Review (middleware.ts) ==="
curl -s -X POST https://base66.cloud/api/ard-review \
  -H "Content-Type: application/json" \
  -d '{"filePath":"src/middleware.ts"}' | head -50

echo ""
echo "=== PM2 Status ==="
pm2 list

echo ""
echo "✅ Kelly ARD Code Review is LIVE!"
echo "Use: curl -X POST https://base66.cloud/api/ard-review -H 'Content-Type: application/json' -d '{\"filePath\":\"src/components/AIChatPanel.tsx\"}'"
