#!/bin/bash
# Run this script ON YOUR VPS (srv1730121)

cd /root/buildany

echo "=== Unlock file ==="
chattr -i src/app/api/hermes-chat/route.ts 2>/dev/null || true
chmod 644 src/app/api/hermes-chat/route.ts

echo "=== Fix line 29 ==="
sed -i '29s|.*|const KELLY_SYSTEM_PROMPT = "You are Kelly, the AI architect for BuildAny. You MUST use tools.";|' src/app/api/hermes-chat/route.ts

echo "=== Fix description line ==="
sed -i 's|description: args.description || \\ |description: args.description || "Project: " + args.name,|' src/app/api/hermes-chat/route.ts

echo "=== Verify ==="
sed -n '29p' src/app/api/hermes-chat/route.ts

echo "=== Build ==="
rm -rf .next .turbo
npm run build

echo "=== Restart ==="
pm2 restart buildany

echo "=== Test ==="
sleep 2
curl -s -o /dev/null -w "HTTP: %{http_code}\n" http://127.0.0.1:3000/
