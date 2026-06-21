#!/bin/bash
# Clean rebuild script
cd /root/buildany
echo "=== Cleaning .next ==="
rm -rf .next
echo "=== Building ==="
npm run build 2>&1 | tail -20
echo "=== Restarting PM2 ==="
pm2 restart buildany
echo "=== Waiting for startup ==="
sleep 5
echo "=== Testing endpoints ==="
echo "--- /ard/discover ---"
curl -s http://127.0.0.1:3000/ard/discover | head -c 200
echo ""
echo "--- /ard/review ---"
curl -s -X POST http://127.0.0.1:3000/ard/review -H "Content-Type: application/json" -d '{"filePath":"src/middleware.ts"}' | head -c 200
echo ""
echo "=== Done ==="