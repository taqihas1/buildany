#!/bin/bash
# BuildAny .env.local setup script
# Run: bash setup-buildany-env.sh

mkdir -p /root/buildany/web

cat > /root/buildany/web/.env.local << 'EOF'
# Database
DATABASE_URL="file:/root/buildany/web/data/buildany.db"

# AI APIs
DEEPSEEK_API_KEY=sk-05d9bec6c9e8467b9ba95294add38a8e

# Auth (Clerk)
CLERK_SECRET_KEY=sk_test_Vg2LoqrRabVR7r4vUHleWCyqpXFT7h7NI0NyM3dpqe
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bm90ZWQtbmFyd2hhbC05OC5jbGVyay5hY2NvdW50cy5kZXYk

# Hermes Bridge
HERMES_URL=http://127.0.0.1:8642
HERMES_API_KEY=buildany-bridge-secret

# BuildAny Config
NEXT_PUBLIC_APP_URL=http://89.39.210.236:3000
EOF

echo "✅ .env.local created with your keys!"
echo ""
echo "📄 File location: /root/buildany/web/.env.local"
echo ""
echo "🔒 Next steps:"
echo "   1. Delete this script: rm setup-buildany-env.sh"
echo "   2. Secure the env file: chmod 600 /root/buildany/web/.env.local"
echo "   3. Continue with BuildAny setup!"
