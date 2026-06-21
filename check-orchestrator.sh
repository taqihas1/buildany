cd /root/buildany

# Find where to add memory hooks in orchestrator
grep -n "function.*phase\|async.*generate\|async.*review" src/lib/orchestrator.ts | head -10

# Show the start of the file to understand structure
head -20 src/lib/orchestrator.ts
