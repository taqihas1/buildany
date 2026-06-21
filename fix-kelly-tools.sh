#!/bin/bash
# Check llm-router for validation issues and find AI Chat component

cd /root/buildany

echo "=== llm-router.ts - check for parse/validate ==="
grep -n "parse\|JSON.parse\|validate\|pattern\|match\|test(" src/lib/llm-router.ts | head -20

echo ""
echo "=== llm-router.ts - full content ==="
cat src/lib/llm-router.ts | tail -n +80 | head -120

echo ""
echo "=== Find AI Chat component ==="
grep -rn "AI Chat\|HermesChat\|useHermesChat" src/components/ src/app/ 2>/dev/null | grep -v node_modules | head -15
