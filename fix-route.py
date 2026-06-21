import os

content = '''import { NextRequest, NextResponse } from "next/server";
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
      description: "Create a new project in BuildAny. Call this when the user wants to build an app, website, or any software project.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Project name" },
          description: { type: "string", description: "Brief description of what the project does" },
          type: { type: "string", enum: ["web", "mobile", "both"], description: "Platform type" },
        },
        required: ["name", "type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "buildany_generate_code",
      description: "Generate code files for a project. Call this after creating a project to generate the initial code.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "The project ID" },
          prompt: { type: "string", description: "What code to generate" },
        },
        required: ["projectId", "prompt"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "buildany_deploy",
      description: "Deploy a project to production. Call this when the user wants to publish their app.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "The project ID to deploy" },
        },
        required: ["projectId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "buildany_research",
      description: "Research competitors, technologies, or best practices before building. Call this when the user asks about what to use or what's popular.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "What to research" },
        },
        required: ["topic"],
      },
    },
  },
];

const KELLY_SYSTEM_PROMPT = `You are Kelly, the AI architect for BuildAny — a platform that builds apps from natural language prompts.

CRITICAL RULES:
1. You MUST use the available tools to perform actions. You CANNOT write files, run code, or access the filesystem directly.
2. When a user wants to create a project, call buildany_create_project.
3. When a user wants to generate code, call buildany_generate_code.
4. When a user wants to deploy, call buildany_deploy.
5. When a user asks about technologies or competitors, call buildany_research.
6. Always confirm what you're doing before calling a tool.
7. Be concise and action-oriented. The user wants to build, not chat.`;

interface ChatRequest {
  message: string;
  projectId?: string;
  history?: Array<{ role: string; content: string }>;
}

async function executeTool(name: string, args: any): Promise<any> {
  console.log(`[Kelly] Executing tool: ${name}`, args);

  switch (name) {
    case "buildany_create_project": {
      const { name: projectName, description, type: projectType } = args;
      const projectId = randomUUID();
      try {
        await db.insert(projects).values({
          id: projectId,
          userId: "system",
          name: projectName,
          description: description || `Project created by Kelly: ${projectName}`,
          type: projectType || "web",
          status: "draft",
        });
        console.log(`[Kelly] Created project: ${projectId}`);
        return { id: projectId, name: projectName, status: "draft", success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown database error";
        console.error("[Kelly] DB error:", errorMsg);
        return { error: errorMsg, success: false };
      }
    }
    case "buildany_generate_code": {
      return { success: false, error: "Code generation not yet implemented" };
    }
    case "buildany_deploy": {
      return { success: false, error: "Deployment not yet implemented" };
    }
    case "buildany_research": {
      return { success: false, error: "Research not yet implemented" };
    }
    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, projectId, history = [] } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const messages = [
      { role: "system", content: KELLY_SYSTEM_PROMPT },
      ...history,
      { role: "user", content: message },
    ];

    console.log("[Kelly Bridge] Calling Hermes:", HERMES_URL);
    console.log("[Kelly Bridge] Message:", message.substring(0, 100));

    const kellyRes = await fetch(HERMES_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HERMES_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: BUILDANY_TOOLS,
        tool_choice: "auto",
        stream: false,
      }),
    });

    if (!kellyRes.ok) {
      const errorText = await kellyRes.text();
      console.error("[Kelly Bridge] Hermes error:", kellyRes.status, errorText);
      return NextResponse.json(
        { error: "Kelly failed to respond", details: errorText },
        { status: 502 }
      );
    }

    const kellyData = await kellyRes.json();
    const choice = kellyData.choices?.[0];
    const reply = choice?.message?.content || "I processed your request.";
    const toolCalls = choice?.message?.tool_calls || [];

    console.log("[Kelly Bridge] Reply:", reply.substring(0, 200));
    console.log("[Kelly Bridge] Tool calls:", toolCalls.length);

    let toolResult: any = null;
    if (toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const toolName = toolCall.function?.name;
      let toolArgs: any = {};
      try {
        toolArgs = JSON.parse(toolCall.function?.arguments || "{}");
      } catch {
        toolArgs = {};
      }

      toolResult = await executeTool(toolName, toolArgs);
      console.log("[Kelly Bridge] Tool result:", JSON.stringify(toolResult).substring(0, 200));
    }

    return NextResponse.json({
      reply,
      toolCalls,
      toolResult,
      projectId: toolResult?.id || projectId,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Kelly Bridge] Error:", errorMsg);
    return NextResponse.json(
      { error: "Internal server error", message: errorMsg },
      { status: 500 }
    );
  }
}
'''

output_path = '/root/buildany/src/app/api/hermes-chat/route.ts'
os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, 'w') as f:
    f.write(content)
print(f'Route file written to {output_path}')
