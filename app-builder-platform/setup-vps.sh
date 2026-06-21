# BuildAny Deploy Script
# Run this on your VPS (root@srv1730121)

set -e

APP_DIR="/opt/buildany"
PORT=3000

echo "🚀 Deploying BuildAny..."

# Install Node.js 22
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "22" ]; then
  echo "Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# Create directory
mkdir -p $APP_DIR
cd $APP_DIR

# Remove old files (keep .env.local if exists)
if [ -f .env.local ]; then
  mv .env.local /tmp/.env.local.backup
fi

rm -rf *

# Extract new build
echo "Extracting app files..."

# Create app structure
cat > package.json << 'EOF'
{
  "name": "buildany",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  }
}
EOF

# Note: Full app files will be rsync'd from local
# For now, create minimal setup

echo "✅ Setup complete. Now run:"
echo "  rsync -avz --exclude=node_modules local-app/ $APP_DIR/"
echo "  cd $APP_DIR && npm install && npm run build"
echo "  pm2 start npm --name buildany -- start"
