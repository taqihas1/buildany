#!/bin/bash
cd /root/buildany

echo "=== 1. useHermesChat.ts (hook that calls API) ==="
cat src/hooks/useHermesChat.ts

echo ""
echo "=== 2. route.ts error returns ==="
grep -n "Kelly error\|new Response\|return.*Response\|NextResponse.json" src/app/api/hermes-chat/route.ts

echo ""
echo "=== 3. ProjectWorkspace toggle ==="
grep -n "Hermes\|AI Assistant\|useHermes\|setUseHermes\|onClick.*Kelly\|onClick.*AI" src/components/ProjectWorkspace.tsx | head -20

echo ""
echo "=== 4. PromptBox entry point ==="
head -50 src/components/PromptBox.tsx

echo ""
echo "=== 5. CreateProjectModal entry point ==="
head -50 src/components/CreateProjectModal.tsx
