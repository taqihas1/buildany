
cd /root/buildany

# Restart PM2
pm2 restart buildany

sleep 5

# Test all endpoints
echo "=== ARD Catalog ==="
curl -s https://base66.cloud/.well-known/ai-catalog.json | head -5

echo ""
echo "=== Kelly ARD Discover ==="
curl -s https://base66.cloud/api/ard-discover | head -30

echo ""
echo "=== PM2 Status ==="
pm2 list
