#!/bin/bash
# Create .env.local for BuildAny on VPS
# Run this on your VPS terminal, then edit with your actual API keys

mkdir -p /root/buildany/web

cat > /root/buildany/web/.env.local << 'ENVFILE'
# Database
DATABASE_URL="file:/root/buildany/web/data/buildany.db"

# AI APIs — replace with your actual DeepSeek key
DEEPSEEK_API_KEY=YOUR_DEEPSEEK_KEY_HERE

# Auth (Clerk) — replace with your actual Clerk keys
CLERK_SECRET_KEY=YOUR_CLERK_SECRET_KEY_HERE
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY_HERE

# Hermes Bridge
HERMES_URL=http://127.0.0.1:8642
HERMES_API_KEY=buildany-bridge-secret

# BuildAny Config
NEXT_PUBLIC_APP_URL=http://89.39.210.236:3000
ENVFILE

echo "✅ Created /root/buildany/web/.env.local"
echo ""
echo "⚠️  IMPORTANT: Edit the file now and replace the placeholders:"
echo "   nano /root/buildany/web/.env.local"
echo ""
echo "Replace these 3 values:"
echo "   DEEPSEEK_API_KEY=sk-..."
echo "   CLERK_SECRET_KEY=sk_test_... or sk_live_..."
echo "   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... or pk_live_..."
