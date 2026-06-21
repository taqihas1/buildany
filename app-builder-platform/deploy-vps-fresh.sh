#!/bin/bash
# BuildAny VPS Deploy Script - Fresh Clone Version
# Run this on your VPS to deploy the latest BuildAny code from GitHub

set -e

REPO_URL="https://github.com/taqihas1/buildany.git"
OLD_DIR="/opt/buildany"
BACKUP_DIR="/opt/buildany-backup-$(date +%Y%m%d-%H%M%S)"
NEW_DIR="/opt/buildany-new"
APP_NAME="buildany"

echo "🚀 BuildAny VPS Deploy Script (Fresh Clone)"
echo "============================================"

# Step 1: Backup current directory
if [ -d "$OLD_DIR" ]; then
    echo "📦 Backing up current directory to $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    cp -r "$OLD_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
    echo "✅ Backup complete"
fi

# Step 2: Clone fresh from GitHub
echo "📥 Cloning fresh repo from GitHub..."
if [ -d "$NEW_DIR" ]; then
    rm -rf "$NEW_DIR"
fi
git clone "$REPO_URL" "$NEW_DIR"

# Step 3: Copy environment and database from old dir
if [ -d "$OLD_DIR" ]; then
    echo "📂 Copying environment and database..."
    if [ -f "$OLD_DIR/.env.local" ]; then
        cp "$OLD_DIR/.env.local" "$NEW_DIR/"
        echo "  ✅ Copied .env.local"
    else
        echo "  ⚠️  .env.local not found in old dir, creating from template..."
        cat > "$NEW_DIR/.env.local" << 'EOF'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bm90ZWQtbmFyd2hhbC05OC5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_Vg2LoqrRabVR7r4vUHleWCyqpXFT7h7NI0NyM3dpqe
DEEPSEEK_API_KEY=Sk-05d9bec6c9e8467b9ba95294add38a8e
DATABASE_URL=./sqlite.db
GITHUB_TOKEN=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
RESEND_API_KEY=re_8a5SS6ZU_HqBGRzH3pirjAKrHSj1vynxf
EOF
    fi
    
    if [ -f "$OLD_DIR/sqlite.db" ]; then
        cp "$OLD_DIR/sqlite.db" "$NEW_DIR/"
        echo "  ✅ Copied sqlite.db"
    fi
fi

# Step 4: Install dependencies
echo "📦 Installing dependencies..."
cd "$NEW_DIR"
npm install --legacy-peer-deps

# Step 5: Build the application
echo "🔨 Building the application..."
npm run build

# Step 6: Swap directories
echo "🔄 Swapping old and new directories..."
if [ -d "$OLD_DIR" ]; then
    mv "$OLD_DIR" "$OLD_DIR-old"
fi
mv "$NEW_DIR" "$OLD_DIR"
cd "$OLD_DIR"

# Step 7: Restart PM2 process
echo "🔄 Restarting PM2 process..."
pm2 restart "$APP_NAME" || pm2 start npm --name "$APP_NAME" -- start

# Step 8: Verify deployment
echo "✅ Verifying deployment..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ]; then
    echo "🎉 Deploy successful! HTTP $HTTP_CODE"
else
    echo "⚠️  Deploy returned HTTP $HTTP_CODE — check logs"
fi

echo ""
echo "============================================"
echo "🎉 Deploy complete!"
echo "🌐 Website: https://base66.cloud"
echo "📊 PM2 status:"
pm2 status "$APP_NAME"
echo ""
echo "If you need to rollback:"
echo "  mv $OLD_DIR-old $OLD_DIR"
echo "  pm2 restart $APP_NAME"
