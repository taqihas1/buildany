// Agent loop: Hermes brain + BuildAny tools
// Routes all AI chat through Hermes with tool-calling capability

import { NextRequest, NextResponse } from "next/server";

const HERMES_URL = process.env.HERMES_URL || "http://localhost:8642";
const HERMES_API_KEY = process.env.HERMES_API_KEY || "";

// Tool definitions for Hermes
const BUILDANY_TOOLS = [
  {
    name: "createProject",
    description: "Create a new BuildAny project from a user prompt",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "What the user wants to build" },
        name: { type: "string", description: "Optional project name" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generateWiki",
    description: "Generate wiki/documentation pages for a project",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "The project ID" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "generateCode",
    description: "Generate code for a project",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "The project ID" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "getProjectStatus",
    description: "Get the current status of a project",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "The project ID" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "listProjects",
    description: "List all BuildAny projects",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];

// Call a BuildAny tool
async function callTool(name: string, params: any) {
  const res = await fetch("http://localhost:3000/api/hermes-tool", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool: name, params }),
  });
  return res.json();
}

// Main agent loop
export async function POST(req: NextRequest) {
  try {
    const { message, projectId, history = [] } = await req.json();

    // Build system prompt with tool definitions
    const systemPrompt = `You are Kelly, the BuildAny AI agent. You help users build apps and software projects.

You have access to these tools:
${BUILDANY_TOOLS.map(t => `- ${t.name}: ${t.description}`).join("\n")}

When a user wants to build something:
1. Create a project with createProject
2. Generate wiki pages with generateWiki  
3. Generate code with generateCode
4. Report progress to the user

Always be helpful, energetic, and action-oriented.`;

    // Prepare messages for Hermes
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    // Step 1: Call Hermes
    const res = await fetch(`${HERMES_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(HERMES_API_KEY ? { "Authorization": `Bearer ${HERMES_API_KEY}` } : {}),
      },
      body: JSON.stringify({ messages, tools: BUILDANY_TOOLS }),
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ reply: `Hermes error: ${error}` }, { status: 502 });
    }

    const data = await res.json();

    // Step 2: Check if Hermes wants to call tools
    if (data.tool_calls && data.tool_calls.length > 0) {
      const toolResults = [];
      
      for (const call of data.tool_calls) {
        const result = await callTool(call.name, call.parameters);
        toolResults.push({ tool: call.name, result });
      }

      // Step 3: Send tool results back to Hermes for final response
      const followUp = await fetch(`${HERMES_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(HERMES_API_KEY ? { "Authorization": `Bearer ${HERMES_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            { role: "assistant", content: data.reply || "" },
            { role: "user", content: `Tool results: ${JSON.stringify(toolResults)}` },
          ],
        }),
      });

      const finalData = await followUp.json();
      return NextResponse.json({
        reply: finalData.reply || finalData.message || "Done!",
        toolCalls: toolResults,
        projectId: toolResults.find((r: any) => r.result?.projectId)?.result?.projectId,
      });
    }

    // No tools called - just return the reply
    return NextResponse.json({
      reply: data.reply || data.message || "I'm here to help! What would you like to build?",
    });
  } catch (error) {
    console.error("[Hermes Chat] Error:", error);
    return NextResponse.json(
      { reply: `Error: ${String(error)}` },
      { status: 500 }
    );
  }
}
