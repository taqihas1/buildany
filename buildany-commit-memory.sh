cd /root/buildany

# Add all new files
git add src/app/api/memory/route.ts

git add src/middleware.ts
git add src/lib/orchestrator.ts
git add .env.local
git add mcp-memory/

# Commit
git commit -m "feat: MCP Memory Server + BuildAny integration

- Add standalone MCP memory server on port 3001 (SQLite + Express)
- Add /api/memory proxy route in BuildAny
- Add MEMORY_SERVER_URL to .env.local
- Fix features.join bug in orchestrator (Array.isArray check)
- Add /api/memory to public routes in middleware"

# Push
git push origin main

echo "=== Done! ==="
