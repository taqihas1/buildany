#!/bin/bash
cd /root/buildany

# Remove all conflict markers from source files
for f in src/app/api/memory/route.ts src/app/api/hermes-chat/route.ts src/components/AIChatPanel.tsx src/lib/orchestrator.ts src/hooks/useHermesChat.ts src/lib/memory-client.ts src/middleware.ts src/components/ProjectWorkspace.tsx; do
  if [ -f "$f" ]; then
    # Remove conflict markers and everything between them, keeping HEAD version (before =====)
    python3 -c "
import re, sys
with open('$f', 'r') as file:
    content = file.read()
# Remove everything from <<<<<<< HEAD to >>>>>>> (keep HEAD version)
content = re.sub(r'<<<<<<< HEAD\n(.*?)=======\n.*?>>>>>>> \w+', r'\1', content, flags=re.DOTALL)
with open('$f', 'w') as file:
    file.write(content)
" 2>/dev/null && echo "✅ Fixed $f" || echo "❌ Failed $f"
  fi
done

# Verify
echo ""
echo "Remaining conflict markers:"
grep -rn "<<<<<<<\|=======\|>>>>>>>" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l

echo ""
echo "Done! Ready to rebuild."
