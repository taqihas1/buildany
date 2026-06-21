#!/bin/bash
# Fix: Make createProject use direct DB calls instead of HTTP API (bypasses auth issues)
set -e
cd /root/buildany

echo "=== Step 1: Finding DB imports used by /api/projects ==="
grep -n "import.*db\|import.*schema\|from.*lib/db" src/app/api/projects/route.ts 2>/dev/null || echo "No projects route found"

echo ""
echo "=== Step 2: Finding projects schema ==="
grep -n "projects\|project" src/lib/db/schema.ts 2>/dev/null | head -20

echo ""
echo "=== Step 3: Finding db connection export ==="
grep -rn "export.*db\|export const db" src/lib/db/ 2>/dev/null | head -10

echo ""
echo "=== Step 4: Current createProject function ==="
sed -n '22,29p' src/app/api/hermes-chat/route.ts
