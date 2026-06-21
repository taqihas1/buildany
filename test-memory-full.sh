cd /root/buildany

echo "=== POST write via BuildAny ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"write","type":"fact","key":"buildany-deploy","content":"MCP Memory Server deployed on BuildAny VPS!","priority":"hot","tags":["deployment","mcp"]}'
echo ""

echo ""
echo "=== POST search via BuildAny ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"search","query":"deploy"}'
echo ""

echo ""
echo "=== POST context via BuildAny ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"context","query":"memory server"}' | head -c 400
echo ""
