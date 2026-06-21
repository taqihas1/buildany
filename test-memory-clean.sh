cd /root/buildany

# Verify middleware has /api/memory
echo "=== Check middleware ==="
grep -c "api/memory" src/middleware.ts

# Test memory API
echo ""
echo "=== GET /api/memory ==="
curl -s http://localhost:3000/api/memory
echo ""

echo ""
echo "=== POST write ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"write","type":"preference","key":"test-vps","content":"Test from VPS!","priority":"hot","tags":["vps"]}'
echo ""

echo ""
echo "=== POST search ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"search","query":"vps"}'
echo ""
