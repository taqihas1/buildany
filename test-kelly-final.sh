#!/bin/bash
cd /root/buildany

echo "=== Test 1: Kelly calling buildany_create_project ==="
curl -s -X POST http://localhost:3000/api/hermes-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Create a new project called TestApp","projectId":"e20859e1-eebb-4bcf-8096-3e2704f1ff79"}' | head -c 2000

echo ""
echo ""
echo "=== Test 2: Check PM2 error logs ==="
tail -5 /root/.pm2/logs/buildany-error.log

echo ""
echo "=== Test 3: Check if project was created in DB ==="
sqlite3 /root/buildany/sqlite.db "SELECT id, name, type, status FROM projects ORDER BY created_at DESC LIMIT 3;" 2>/dev/null || echo "SQLite3 not available, skip DB check"
