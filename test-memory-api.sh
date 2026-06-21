cd /root/buildany

echo "=== GET /api/memory (health) ==="
curl -s http://localhost:3000/api/memory
echo ""

echo ""
echo "=== POST write ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"write","type":"preference","key":"buildany-test","content":"Memory API works via BuildAny!","priority":"hot","tags":["test","buildany"]}'
echo ""

echo ""
echo "=== POST search ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"search","query":"buildany"}'
echo ""

echo ""
echo "=== POST context ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"context","query":"test"}' | head -c 500
echo ""
