#!/bin/bash
# Protected build script for BuildAny
# This script fixes the file, builds, and verifies in one atomic operation

cd /root/buildany

# STEP 1: Fix the file (ensure it's correct before building)
cat > src/app/api/hermes-chat/route.ts << 'EOFEOF'
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
      console.error("Tool error:", err);
      return { error: "Database error" };
    }
  }
  return { error: "Unknown tool" };
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
EOFEOF

# STEP 2: Verify file is correct
echo "=== File before build ==="
head -30 src/app/api/hermes-chat/route.ts | grep -n "KELLY_SYSTEM_PROMPT"

# STEP 3: Nuke caches
rm -rf .next .turbo node_modules/.cache /tmp/turbopack* /tmp/next* ~/.cache/turbopack ~/.cache/next

# STEP 4: Build
echo "=== Building ==="
npm run build

# STEP 5: Verify file is still correct after build
echo "=== File after build ==="
head -30 src/app/api/hermes-chat/route.ts | grep -n "KELLY_SYSTEM_PROMPT"

# STEP 6: Restart if build succeeded
if [ $? -eq 0 ]; then
  echo "=== Build SUCCESS — Restarting PM2 ==="
  pm2 restart buildany
  curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://127.0.0.1:3000/
else
  echo "=== Build FAILED ==="
fi
