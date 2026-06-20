const fs = require('fs');
const path = require('path');

const BUILDANY_DIR = '/root/buildany';

// 1. Copy hermes-tool route
const toolRouteSrc = path.join(BUILDANY_DIR, 'src/app/api/hermes-tool/route.ts');
const toolRouteContent = `import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { KellyOrchestrator } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";

const TOOLS = {
  async createProject(params) {
    const projectId = crypto.randomUUID();
    const name = params.name || params.prompt.slice(0, 50);
    await db.insert(projects).values({
      id: projectId, name, prompt: params.prompt,
      status: "created", createdAt: new Date(), updatedAt: new Date(),
    });
    return { success: true, projectId, name,
      message: \`Created project "\${name}" (\${projectId}).\` };
  },
  async generateWiki(params) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.projectId) });
    if (!project) return { success: false, error: "Project not found" };
    const kelly = new KellyOrchestrator(params.projectId);
    const wiki = await kelly.generateWikiPages(project.prompt, project.name);
    await db.update(projects).set({ status: "wiki-generated", updatedAt: new Date() })
      .where(eq(projects.id, params.projectId));
    return { success: true, projectId: params.projectId,
      wikiPages: wiki.pages.map(p => p.title),
      message: \`Generated \${wiki.pages.length} wiki pages.\` };
  },
  async generateCode(params) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.projectId) });
    if (!project) return { success: false, error: "Project not found" };
    const kelly = new KellyOrchestrator(params.projectId);
    const result = await kelly.generateCode(project.prompt, project.name);
    await db.update(projects).set({ status: "code-generated", updatedAt: new Date() })
      .where(eq(projects.id, params.projectId));
    return { success: true, projectId: params.projectId,
      filesGenerated: result.files?.length || 0,
      message: \`Generated \${result.files?.length || 0} files.\` };
  },
  async getProjectStatus(params) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.projectId) });
    if (!project) return { success: false, error: "Project not found" };
    return { success: true, projectId: params.projectId, name: project.name,
      status: project.status, createdAt: project.createdAt, updatedAt: project.updatedAt };
  },
  async listProjects() {
    const all = await db.query.projects.findMany({
      orderBy: (p, { desc }) => [desc(p.createdAt)], limit: 20 });
    return { success: true, count: all.length,
      projects: all.map(p => ({ id: p.id, name: p.name, status: p.status, createdAt: p.createdAt })) };
  },
};

export async function POST(req) {
  try {
    const { tool, params } = await req.json();
    if (!tool || !(tool in TOOLS)) {
      return NextResponse.json({ success: false,
        error: \`Unknown tool: \${tool}. Available: \${Object.keys(TOOLS).join(", ")}\` }, { status: 400 });
    }
    const result = await TOOLS[tool](params || {});
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
`;

fs.mkdirSync(path.dirname(toolRouteSrc), { recursive: true });
fs.writeFileSync(toolRouteSrc, toolRouteContent);
console.log('✅ Created src/app/api/hermes-tool/route.ts');

// 2. Update hermes-chat route with agent loop
const chatRoutePath = path.join(BUILDANY_DIR, 'src/app/api/hermes-chat/route.ts');
const chatRouteContent = `import { NextRequest, NextResponse } from "next/server";

const HERMES_URL = process.env.HERMES_URL || "http://localhost:8642";

const BUILDANY_TOOLS = [
  { name: "createProject", description: "Create a new project from a user prompt",
    parameters: { type: "object", properties: {
      prompt: { type: "string", description: "What to build" },
      name: { type: "string", description: "Optional name" } }, required: ["prompt"] } },
  { name: "generateWiki", description: "Generate wiki pages for a project",
    parameters: { type: "object", properties: {
      projectId: { type: "string" } }, required: ["projectId"] } },
  { name: "generateCode", description: "Generate code for a project",
    parameters: { type: "object", properties: {
      projectId: { type: "string" } }, required: ["projectId"] } },
  { name: "getProjectStatus", description: "Get project status",
    parameters: { type: "object", properties: {
      projectId: { type: "string" } }, required: ["projectId"] } },
  { name: "listProjects", description: "List all projects",
    parameters: { type: "object", properties: {} } },
];

async function callTool(name, params) {
  const res = await fetch("http://localhost:3000/api/hermes-tool", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool: name, params }) });
  return res.json();
}

export async function POST(req) {
  try {
    const { message, history = [] } = await req.json();
    const systemPrompt = \`You are Kelly, the BuildAny AI agent. You build apps and software.
Available tools: \${BUILDANY_TOOLS.map(t => t.name).join(", ")}.
When user wants to build something, use createProject first, then generateWiki, then generateCode.
Always be energetic and action-oriented.\`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    // Call Hermes
    const res = await fetch(\`\${HERMES_URL}/chat\`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, tools: BUILDANY_TOOLS }) });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ reply: \`Hermes error: \${err}\` }, { status: 502 });
    }

    const data = await res.json();

    // Handle tool calls
    if (data.tool_calls?.length > 0) {
      const results = [];
      for (const call of data.tool_calls) {
        results.push({ tool: call.name, result: await callTool(call.name, call.parameters) });
      }
      // Follow-up with tool results
      const followUp = await fetch(\`\${HERMES_URL}/chat\`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [
          ...messages,
          { role: "assistant", content: data.reply || "" },
          { role: "user", content: \`Results: \${JSON.stringify(results)}\` },
        ]}) });
      const final = await followUp.json();
      return NextResponse.json({
        reply: final.reply || final.message || "Done!",
        toolCalls: results,
        projectId: results.find(r => r.result?.projectId)?.result?.projectId,
      });
    }

    return NextResponse.json({
      reply: data.reply || data.message || "What would you like to build?",
    });
  } catch (e) {
    return NextResponse.json({ reply: \`Error: \${String(e)}\` }, { status: 500 });
  }
}
`;

fs.writeFileSync(chatRoutePath, chatRouteContent);
console.log('✅ Updated src/app/api/hermes-chat/route.ts (agent loop)');

// 3. Add /api/hermes-tool to PUBLIC_API_ROUTES in middleware.ts
const middlewarePath = path.join(BUILDANY_DIR, 'src/middleware.ts');
let middleware = fs.readFileSync(middlewarePath, 'utf8');
if (!middleware.includes('hermes-tool')) {
  middleware = middleware.replace(
    '/api/hermes-chat',
    '/api/hermes-chat",\n    "/api/hermes-tool'
  );
  fs.writeFileSync(middlewarePath, middleware);
  console.log('✅ Added /api/hermes-tool to PUBLIC_API_ROUTES');
} else {
  console.log('ℹ️ /api/hermes-tool already in PUBLIC_API_ROUTES');
}

console.log('\\n🚀 BuildAny + Hermes integration complete!');
console.log('Next: npm run build && pm2 restart buildany');
