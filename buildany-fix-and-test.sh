cd /root/buildany

# Fix features.join bug - use a different delimiter for sed
grep -n "features.*join" src/lib/orchestrator.ts

# Replace with safe array check
sed -i 's#(c.features || \[\]).join#(Array.isArray(c.features) ? c.features : []).join#g' src/lib/orchestrator.ts

# Verify the fix
echo "=== After fix ==="
grep -n "features.*join" src/lib/orchestrator.ts

# Rebuild
npm run build && pm2 restart buildany --update-env

# Test memory API
echo ""
echo "=== GET /api/memory ==="
curl -s http://localhost:3000/api/memory
echo ""

echo ""
echo "=== POST write ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"write","type":"preference","key":"buildany-test","content":"Memory API works via BuildAny!","priority":"hot","tags":["test"]}'
echo ""

echo ""
echo "=== POST search ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"search","query":"buildany"}'
echo ""
