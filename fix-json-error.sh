#!/bin/bash
# Fix 1: Ensure /api/hermes-chat ALWAYS returns JSON, even on errors
cd /root/buildany

echo "=== Before fix ==="
grep -n "Kelly error\|return new Response" src/app/api/hermes-chat/route.ts

# Replace plain text error returns with JSON error returns
sed -i 's/return new Response(`Kelly error: \${await kellyRes.text()}`, { status: 502 });/return NextResponse.json({ error: `Kelly error: ${await kellyRes.text()}` }, { status: 502 });/' src/app/api/hermes-chat/route.ts

echo ""
echo "=== After fix ==="
grep -n "Kelly error\|return.*Response" src/app/api/hermes-chat/route.ts

echo ""
echo "Building..."
npm run build && pm2 restart buildany
