#!/bin/bash
cd /root/buildany

# Resolve remaining conflicts
git checkout --ours src/components/ProjectWorkspace.tsx src/lib/memory-client.ts

# Stage all
git add -A

# Commit
git commit -m "Resolve remaining conflicts + add ARD catalog"

# Push
git pull origin main --no-edit && git push origin main

echo "Done!"
