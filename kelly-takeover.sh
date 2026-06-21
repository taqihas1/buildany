#!/bin/bash
cd /root/buildany

# FIX 1: Ensure API always returns JSON
echo "=== Fix 1: JSON error responses ==="
grep -n "return new Response" src/app/api/hermes-chat/route.ts
sed -i 's/return new Response(`Kelly error: \${await kellyRes.text()}`/return NextResponse.json({ error: `Kelly error: ${await kellyRes.text()}` }/' src/app/api/hermes-chat/route.ts

# FIX 2: Remove AI Assistant toggle from ProjectWorkspace
echo ""
echo "=== Fix 2: Finding AI Assistant toggle ==="
grep -n "AI Assistant\|Hermes.*toggle\|useHermes\|setUseHermes" src/components/ProjectWorkspace.tsx | head -10

# FIX 3: Rename Future Release → Agents/Tasks
echo ""
echo "=== Fix 3: Renaming Future Release tab ==="
grep -rn "Future Release" src/components/ | head -10

# FIX 4: Check useHermesChat hook for JSON parsing
echo ""
echo "=== Fix 4: useHermesChat hook ==="
cat src/hooks/useHermesChat.ts
