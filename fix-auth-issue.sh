#!/bin/bash
set -e
cd /root/buildany

echo "=== Reading hermes-chat route to find createProject function ==="
grep -n -A 30 "async function createProject" src/app/api/hermes-chat/route.ts

echo ""
echo "=== Checking what db functions are available ==="
grep -rn "export.*function.*createProject\|export.*createProject" src/lib/db/ 2>/dev/null | head -10
grep -rn "insert.*projects" src/lib/db/ 2>/dev/null | head -10
