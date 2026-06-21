
cd /root/buildany

# Stop PM2 first to prevent restart loops
pm2 stop buildany

# Clean and rebuild
rm -rf .next
npm run build

# If build succeeds, restart
if [ -d ".next" ]; then
  pm2 restart buildany
  sleep 3
  pm2 list
  
  # Test ARD catalog
  echo "=== ARD Catalog ==="
  curl -s https://base66.cloud/.well-known/ai-catalog.json | head -5
  
  # Test Kelly ARD Discover
  echo ""
  echo "=== Kelly ARD Discover ==="
  curl -s https://base66.cloud/api/ard-discover | head -20
else
  echo "❌ Build failed - .next directory missing"
fi
