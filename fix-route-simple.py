import os

# Part 1: Write basic imports and setup
content1 = '''import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { randomUUID } from "crypto";

const HERMES_URL = process.env.HERMES_URL || "http://127.0.0.1:8642/v1/chat/completions";
const HERMES_API_KEY = process.env.HERMES_API_KEY || "";
const MODEL = process.env.HERMES_MODEL || "deepseek-chat";
'''

# Part 2: Tools array
content2 = '''
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
'''

# Part 3: System prompt and interface
content3 = '''
const KELLY_SYSTEM_PROMPT = `You are Kelly, the AI architect for BuildAny. You MUST use tools.`;

interface ChatRequest {
  message: string;
  projectId?: string;
  history?: Array<{ role: string; content: string }>;
}
'''

# Part 4: Execute tool function
content4 = '''
async function executeTool(name: string, args: any): Promise<any> {
  if (name === "buildany_create_project") {
    const pid = randomUUID();
    try {
      await db.insert(projects).values({
        id: pid, userId: "system", name: args.name,
        description: args.description || `Project: ${args.name}`,
        type: args.type || "web", status: "draft",
      });
      return { id: pid, name: args.name, status: "draft", success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "DB error";
      return { error: msg, success: false };
    }
  }
  return { success: false, error: "Unknown tool" };
}
'''

# Part 5: POST handler
content5 = '''
export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, projectId, history = [] } = body;
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    const msgs = [
      { role: "system", content: KELLY_SYSTEM_PROMPT },
      ...history, { role: "user", content: message },
    ];
    const res = await fetch(HERMES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${HERMES_API_KEY}` },
      body: JSON.stringify({ model: MODEL, messages: msgs, tools: BUILDANY_TOOLS, tool_choice: "auto", stream: false }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: "Kelly failed", details: txt }, { status: 502 });
    }
    const data = await res.json();
    const choice = data.choices?.[0];
    const reply = choice?.message?.content || "Done.";
    const tcs = choice?.message?.tool_calls || [];
    let toolResult = null;
    if (tcs.length > 0) {
      const tc = tcs[0];
      let args = {};
      try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {}
      toolResult = await executeTool(tc.function?.name, args);
    }
    return NextResponse.json({ reply, toolCalls: tcs, toolResult, projectId: toolResult?.id || projectId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Server error", message: msg }, { status: 500 });
  }
}
'''

# Write all parts
output_path = '/root/buildany/src/app/api/hermes-chat/route.ts'
os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, 'w') as f:
    f.write(content1)
    f.write(content2)
    f.write(content3)
    f.write(content4)
    f.write(content5)

print(f'File written: {output_path}')
print(f'Size: {os.path.getsize(output_path)} bytes')
