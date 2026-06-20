#!/bin/bash
# fix-kelly.sh - Fix KELLY_SYSTEM_PROMPT syntax error and rebuild

FILE="/root/buildany/src/app/api/hermes-chat/route.ts"

echo "=== Unlocking file ==="
chattr -i "$FILE" 2>/dev/null || true

echo "=== Writing correct content ==="
cat > "$FILE" << 'FIXEOF'
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { randomUUID } from "crypto";

const HERMES_URL = process.env.HERMES_URL || "http://127.0.0.1:8642/v1/chat/completions";
const HERMES_API_KEY = process.env.HERMES_API_KEY || "";
const MODEL = process.env.HERMES_MODEL || "deepseek-chat";

const BUILDANY_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "buildany_create_project",
      description: "Create a new project in BuildAny.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          type: { type: "string", enum: ["web", "mobile", "both"] },
        },
        required: ["name", "type"],
      },
    },
  },
];

const KELLY_SYSTEM_PROMPT = "You are Kelly, the AI architect for BuildAny. You MUST use tools.";

interface ChatRequest {
  message: string;
  projectId?: string;
  history?: Array<{ role: string; content: string }>;
}

async function executeTool(name: string, args: any): Promise<any> {
  if (name === "buildany_create_project") {
    const pid = randomUUID();
    try {
      await db.insert(projects).values({
        id: pid,
        userId: "system",
        name: args.name,
        description: args.description || "Project: " + args.name,
        type: args.type || "web",
        status: "draft",
      });
      return { id: pid, name: args.name, status: "draft", success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "DB error";
      return { error: msg, success: false };
    }
  }
  return { success: false, error: "Unknown tool" };
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, projectId, history = [] } = body;

    const messages = [
      { role: "system" as const, content: KELLY_SYSTEM_PROMPT },
      ...history,
      { role: "user" as const, content: message },
    ];

    const response = await fetch(HERMES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + HERMES_API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: BUILDANY_TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: "Hermes fetch failed: " + response.status + " " + errText }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";
    const tcs = data.choices?.[0]?.message?.tool_calls || [];

    let toolResult = null;
    if (tcs.length > 0) {
      const tc = tcs[0];
      let args = {};
      try {
        args = JSON.parse(tc.function?.arguments || "{}");
      } catch {}
      toolResult = await executeTool(tc.function?.name, args);
    }
    return NextResponse.json({
      reply,
      toolCalls: tcs,
      toolResult,
      projectId: toolResult?.id || projectId,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
FIXEOF

echo "=== Verifying line 29 ==="
cat -n "$FILE" | sed -n '29p'

echo "=== Locking file ==="
chattr +i "$FILE" 2>/dev/null || chmod 444 "$FILE"

echo "=== Clearing caches ==="
cd /root/buildany
rm -rf .next .turbo node_modules/.cache /tmp/turbopack* /tmp/next*

echo "=== Building ==="
npm run build

if [ $? -eq 0 ]; then
  echo "=== Build SUCCESS - Restarting PM2 ==="
  pm2 restart buildany
  sleep 2
  curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://127.0.0.1:3000/
else
  echo "=== Build FAILED ==="
fi
