#!/bin/bash
# Resolve all conflicts by keeping local (VPS) versions
cd /root/buildany

# For binary files and logs, take ours
for f in api-debug.log package-lock.json package.json sqlite.db; do
  git checkout --ours "$f" 2>/dev/null
done

# For source files, take ours (local VPS versions)
for f in src/app/api/hermes-chat/route.ts src/app/api/memory/route.ts src/components/AIChatPanel.tsx src/hooks/useHermesChat.ts src/lib/orchestrator.ts src/middleware.ts; do
  git checkout --ours "$f" 2>/dev/null
done

# Stage all
git add -A

# Commit
git commit -m "Merge remote + add ARD catalog (keep VPS local versions)"

# Push
git push origin main

echo "Done!"
