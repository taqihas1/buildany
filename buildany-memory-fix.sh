cd /root/buildany

# Add /api/memory to public API routes in middleware
sed -i 's|"/api/hermes-chat",|"/api/hermes-chat",\n  "/api/memory",|g' src/middleware.ts

# Verify it was added
grep -A 5 "PUBLIC_API_ROUTES" src/middleware.ts

# Build and restart
npm run build
pm2 restart buildany --update-env

# Test GET health endpoint
echo "=== Testing GET /api/memory ==="
curl -s http://localhost:3000/api/memory | head -c 200

echo -e "\n\n=== Testing POST write ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"write","type":"preference","key":"test-api","content":"API memory works!","priority":"hot","tags":["test"]}'

echo -e "\n\n=== Testing POST context ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"context","query":"test"}' | head -c 300

echo -e "\n\n=== Testing POST search ==="
curl -s -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{"action":"search","query":"test"}' | head -c 300
