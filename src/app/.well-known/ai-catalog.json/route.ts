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
