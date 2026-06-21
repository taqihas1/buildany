cd /root/buildany

# Step 1: Add import at the top of orchestrator
sed -i '1s|^|import { memory, getMemoryContext } from "./memory-client";\n|' src/lib/orchestrator.ts

# Step 2: Add memory hook after research phase (save competitor findings)
sed -i '/Research complete/i\
    // Remember research findings for future projects\
    await memory.pattern("research-" + projectId, `Project ${projectId} researched: ${techStack?.competitors?.map((c: any) => c.name).join(", ") || "no competitors"}`, ["research", techStack?.platform || "web"]);' src/lib/orchestrator.ts

# Step 3: Add memory hook after stack selection (save decision)
sed -i '/Stack selected/i\
    // Remember tech stack decision\
    await memory.decision("stack-" + projectId, `Chose ${techStack?.framework} + ${techStack?.styling} for ${techStack?.platform} app`, projectId, ["stack", techStack?.platform || "web"]);' src/lib/orchestrator.ts

# Step 4: Add memory hook after code review (save bug fixes)
sed -i '/Review complete/i\
    // Remember any fixes from review\
    if (reviewResult?.fixes?.length > 0) {\
      await memory.bugfix("fixes-" + projectId, `Applied ${reviewResult.fixes.length} fixes: ${reviewResult.fixes.join(", ")}`, ["review", projectId]);\
    }' src/lib/orchestrator.ts

echo "=== Verifying memory hooks ==="
grep -n "memory\." src/lib/orchestrator.ts | head -10

echo ""
echo "=== Building ==="
npm run build && pm2 restart buildany --update-env

echo ""
echo "✅ Kelly now auto-remembers every project!"
