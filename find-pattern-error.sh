#!/bin/bash
cd /root/buildany

# Search for "pattern" in UI components and hooks
echo "=== Searching for 'pattern' in components ==="
grep -rn "pattern\|match\|test(" src/components/ src/hooks/ 2>/dev/null | grep -v node_modules | head -20

echo ""
echo "=== Searching for 'pattern' in app routes ==="
grep -rn "pattern\|match\|test(" src/app/api/ 2>/dev/null | grep -v node_modules | head -20

echo ""
echo "=== AIChatPanel.tsx content ==="
cat src/components/AIChatPanel.tsx 2>/dev/null || echo "File not found"
