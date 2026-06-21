import { NextRequest } from "next/server";

const HERMES_API_URL = process.env.HERMES_API_URL || "http://localhost:8642";
const HERMES_API_KEY = process.env.HERMES_API_KEY!;

/**
 * BuildAny tools exposed to Hermes.
 * Hermes receives these in the API request and can call them.
 */
const BUILDANY_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "buildany_create_project",
      description: "Create a new app project in BuildAny. Returns project ID and URL.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "User's app description" },
          platform: { type: "string", enum: ["web", "mobile", "both"], description: "Target platform" },
          name: { type: "string", description: "Optional project name" }
        },
        required: ["prompt", "platform"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "buildany_generate_code",
      description: "Generate code for a project based on wiki specs. Returns file list.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID" },
          wiki_content: { type: "string", description: "Technical specs from wiki" }
        },
        required: ["project_id", "wiki_content"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "buildany_deploy",
      description: "Deploy a project to the VPS. Returns deployment URL.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "Project ID to deploy" }
        },
        required: ["project_id"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "buildany_research",
      description: "Research competitor apps and best practices. Returns research findings.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "What to research" }
        },
        required: ["topic"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "buildany_memory_read",
      description: "Read past memories/context from BuildAny memory server.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          project_id: { type: "string", description: "Optional project scope" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "buildany_memory_write",
      description: "Save a memory/fact to BuildAny memory server.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Memory key" },
          value: { type: "string", description: "Memory content" },
          type: { type: "string", enum: ["fact", "preference", "decision", "pattern", "bugfix", "project"], description: "Memory type" }
        },
        required: ["key", "value", "type"]
      }
    }
  }
];

/**
 * Execute a BuildAny tool call requested by Hermes.
 */
async function executeToolCall(toolCall: {
  id: string;
  function: { name: string; arguments: string };
}) {
  const args = JSON.parse(toolCall.function.arguments);

  switch (toolCall.function.name) {
    case "buildany_create_project": {
      const res = await fetch("http://localhost:3000/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: args.prompt,
          platform: args.platform,
          name: args.name || undefined
        })
      });
      return { tool_call_id: toolCall.id, output: await res.text() };
    }

    case "buildany_generate_code": {
      const res = await fetch("http://localhost:3000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: args.project_id,
          wikiContent: args.wiki_content
        })
      });
      return { tool_call_id: toolCall.id, output: await res.text() };
    }

    case "buildany_deploy": {
      const res = await fetch(`http://localhost:3000/api/project/${args.project_id}/deploy`, {
        method: "POST"
      });
      return { tool_call_id: toolCall.id, output: await res.text() };
    }

    case "buildany_research": {
      // Research goes to the LLM directly via Hermes skills
      return { tool_call_id: toolCall.id, output: "Hermes uses its research skill internally." };
    }

    case "buildany_memory_read": {
      const res = await fetch("http://localhost:3000/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", query: args.query, project_id: args.project_id })
      });
      return { tool_call_id: toolCall.id, output: await res.text() };
    }

    case "buildany_memory_write": {
      const res = await fetch("http://localhost:3000/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write", key: args.key, value: args.value, type: args.type })
      });
      return { tool_call_id: toolCall.id, output: await res.text() };
    }

    default:
      return { tool_call_id: toolCall.id, output: `Unknown tool: ${toolCall.function.name}` };
  }
}

/**
 * POST /api/hermes-chat
 *
 * All chat messages go through Hermes.
 * Hermes can call BuildAny tools via function calling.
 */
export async function POST(req: NextRequest) {
  const { message, projectId, history = [] } = await req.json();

  // Build messages array
  const messages = [
    {
      role: "system" as const,
      content: `You are Kelly, the BuildAny AI agent. You help users build web and mobile apps.\n` +
        `You have access to BuildAny tools to create projects, generate code, deploy, and manage memory.\n` +
        `When a user wants to build an app, use the buildany_create_project tool first.\n` +
        `Always be concise and action-oriented.`
    },
    ...history,
    { role: "user", content: message }
  ];

  // Call Hermes with tool definitions
  const hermesRes = await fetch(`${HERMES_API_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HERMES_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      tools: BUILDANY_TOOLS,
      tool_choice: "auto",
      stream: true
    })
  });

  if (!hermesRes.ok) {
    const error = await hermesRes.text();
    return new Response(`Hermes error: ${error}`, { status: 502 });
  }

  // For non-streaming, we'd parse tool calls and execute them.
  // For streaming, we pipe through and let the frontend parse tool calls.
  // Simpler approach: buffer, parse, execute tools, return final.

  // Read full response (non-streaming for simplicity - can upgrade to SSE later)
  const hermesData = await hermesRes.json();
  const choice = hermesData.choices?.[0];

  // If Hermes requested tool calls, execute them
  if (choice?.message?.tool_calls) {
    const toolResults = await Promise.all(
      choice.message.tool_calls.map(executeToolCall)
    );

    // Send tool results back to Hermes for final response
    const followUpMessages = [
      ...messages,
      choice.message,
      ...toolResults.map((r: any) => ({
        role: "tool" as const,
        tool_call_id: r.tool_call_id,
        content: r.output
      }))
    ];

    const finalRes = await fetch(`${HERMES_API_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HERMES_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: followUpMessages,
        tools: BUILDANY_TOOLS,
        tool_choice: "auto"
      })
    });

    const finalData = await finalRes.json();
    return Response.json({
      reply: finalData.choices?.[0]?.message?.content || "Done",
      toolCalls: choice.message.tool_calls,
      toolResults,
      projectId
    });
  }

  // No tool calls - just return Hermes response
  return Response.json({
    reply: choice?.message?.content || "No response",
    projectId
  });
}
