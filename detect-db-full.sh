#!/bin/bash
# Fix hermes-chat route: Use direct DB calls instead of HTTP API (fixes "Unauthorized" error)
set -e
cd /root/buildany

echo "=== Step 1: Read projects route to understand DB pattern ==="
head -30 src/app/api/projects/route.ts

echo ""
echo "=== Step 2: Read schema for projects table ==="
grep -n -A 10 "export const projects" src/lib/db/schema.ts || grep -n -A 10 "projects" src/lib/db/schema.ts | head -20

echo ""
echo "=== Step 3: Check db export ==="
grep -n "export.*db" src/lib/db/index.ts || grep -rn "export.*db" src/lib/db/ | head -5
