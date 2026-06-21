#!/bin/bash
cd /root/buildany

# Check if file exists in public
echo "=== public/.well-known/ ==="
ls -la public/.well-known/ 2>/dev/null || echo "Directory not found"

# Check Next.js build output
echo "=== .next/static/.well-known/ ==="
find .next -name "ai-catalog.json" -o -name ".well-known" 2>/dev/null | head -10

# Check if there's a route handler for .well-known
echo "=== Routes for .well-known ==="
ls -la src/app/.well-known/ 2>/dev/null || echo "No route handler"

# The issue: Next.js might not serve static files from public/.well-known
# We need to create a route handler instead
echo "=== Creating route handler for ARD catalog ==="
mkdir -p src/app/.well-known
cat > src/app/.well-known/ai-catalog.json/route.ts << 'EOF'
import { NextResponse } from 'next/server';

export async function GET() {
  const catalog = {
    "schema_version": "1.0",
    "name": "BuildAny VPS Infrastructure",
    "description": "Hostinger VPS running BuildAny platform and supporting services",
    "domain": "base66.cloud",
    "tools": [
      {
        "name": "buildany_app",
        "type": "web_application",
        "endpoint": "http://localhost:3000",
        "description": "BuildAny - AI app builder platform",
        "status": "active",
        "managed_by": "pm2"
      },
      {
        "name": "hermes_ai_gateway",
        "type": "ai_agent",
        "endpoint": "http://localhost:8642/v1/chat/completions",
        "description": "Kelly AI agent gateway for BuildAny. Uses DeepSeek API via Hermes.",
        "status": "active",
        "managed_by": "docker"
      }
    ],
    "agents": [
      {
        "name": "Kelly",
        "type": "orchestrator",
        "description": "Primary AI agent for BuildAny",
        "gateway": "http://localhost:8642/v1/chat/completions",
        "model": "deepseek-chat"
      }
    ]
  };

  return NextResponse.json(catalog, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}
EOF

echo "=== Route handler created ==="
ls -la src/app/.well-known/ai-catalog.json/

# Rebuild
rm -rf .next && npm run build

# Restart
pm2 restart buildany

echo "=== Test ==="
sleep 3
curl -s -o /dev/null -w "%{http_code}" https://base66.cloud/.well-known/ai-catalog.json
