#!/bin/bash
# KELLY TAKEOVER: Remove old orchestrator, make Kelly the only brain
cd /root/buildany

echo "=== FIX 1: API always returns JSON ==="
sed -i 's/return new Response(`Kelly error: \${await kellyRes.text()}`/return NextResponse.json({ error: `Kelly error: ${await kellyRes.text()}` }/' src/app/api/hermes-chat/route.ts
echo "Done"

echo ""
echo "=== FIX 2: Rename 'Future Release' to 'Agents/Tasks' ==="
# Find and replace in all component files
find src/components -type f -name "*.tsx" -exec sed -i 's/Future Release/Agents\/Tasks/g' {} \;
echo "Done"

echo ""
echo "=== FIX 3: Building... ==="
npm run build

echo ""
echo "=== FIX 4: Restarting ==="
pm2 restart buildany

echo ""
echo "=== FIX 5: Testing Kelly endpoint ==="
curl -s -X POST http://localhost:3000/api/hermes-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hi","projectId":"test"}' | head -c 500

echo ""
echo "Done! Check the browser now."
