const fs = require('fs');

const content = `import { NextRequest } from "next/server";

const HERMES_URL = process.env.HERMES_API_URL || "http://localhost:8642";
const HERMES_KEY = process.env.HERMES_API_KEY!;

const TOOLS = [{
  type: "function" as const,
  function: {
    name: "buildany_create_project",
    description: "Create a new app project in BuildAny",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "User app description" },
        platform: { type: "string", enum: ["web", "mobile", "both"] }
      },
      required: ["prompt", "platform"]
    }
  }
}, {
  type: "function" as const,
  function: {
    name: "buildany_deploy",
    description: "Deploy a project to the VPS",
    parameters: {
      type: "object",
      properties: { project_id: { type: "string" } },
      required: ["project_id"]
    }
  }
}];

async function execTool(name: string, args: any) {
  if (name === "buildany_create_project") {
    const r = await fetch("http://localhost:3000/api/project", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: args.prompt, platform: args.platform })
    });
    return { ok: r.ok, result: await r.json() };
  }
  if (name === "buildany_deploy") {
    const r = await fetch("http://localhost:3000/api/project/" + args.project_id + "/deploy", { method: "POST" });
    return { ok: r.ok, result: await r.json() };
  }
  return { ok: false, error: "Unknown tool: " + name };
}

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json();
  const res = await fetch(HERMES_URL + "/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + HERMES_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "hermes-agent",
      messages: [
        { role: "system", content: "You are Kelly, the BuildAny AI agent. Help users build apps. Use buildany_create_project when user wants to build something." },
        ...history,
        { role: "user", content: message }
      ],
      tools: TOOLS,
      tool_choice: "auto"
    })
  });
  if (!res.ok) return new Response("Hermes error: " + await res.text(), { status: 502 });
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  if (msg?.tool_calls) {
    const results = await Promise.all(msg.tool_calls.map((tc: any) => {
      const args = JSON.parse(tc.function.arguments);
      return execTool(tc.function.name, args);
    }));
    return Response.json({ reply: msg.content || "Working on it...", toolCalls: msg.tool_calls, toolResults: results });
  }
  return Response.json({ reply: msg?.content || "No response" });
}`;

fs.writeFileSync('/root/buildany/src/app/api/hermes-chat/route.ts', content);
console.log('File written!');
