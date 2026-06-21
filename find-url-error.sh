#!/bin/bash
cd /root/buildany

echo "=== Searching for 'new URL' in hooks and components ==="
grep -rn "new URL\|URL(" src/hooks/ src/components/ 2>/dev/null | grep -v node_modules | head -20

echo ""
echo "=== useHermesChat hook ==="
cat src/hooks/useHermesChat.ts 2>/dev/null || echo "File not found"

echo ""
echo "=== Searching for 'pattern' error in any file ==="
grep -rn "did not match" src/ 2>/dev/null | head -10
