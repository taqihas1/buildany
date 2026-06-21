import { NextRequest } from "next/server";

const HERMES_API_URL = process.env.HERMES_API_URL || "http://localhost:8642";
const HERMES_API_KEY = process.env.HERMES_API_KEY!;

function detectBuildIntent(message: string) {
  const lower = message.toLowerCase();
  const buildWords = ['build','create','make','generate','start'];
  const appWords = ['app','website','web app','mobile app','site'];
  const hasBuild = buildWords.some(w => lower.includes(w));
  const hasApp = appWords.some(w => lower.includes(w));
  if (!hasBuild || !hasApp) return null;
  let name;
  const m = message.match(/called\s+["']?([^"']+)["']?/i) || message.match(/named\s+["']?([^"']+)["']?/i);
  if (m) name = m[1].trim();
  let platform = 'both';
  if (lower.includes('mobile') && !lower.includes('web')) platform = 'mobile';
  else if (lower.includes('web') && !lower.includes('mobile')) platform = 'web';
  return { name, platform };
}

async function createProject(prompt: string, platform: string, name?: string) {
  const res = await fetch("http://localhost:3000/api/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, platform, name })
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  const { message, projectId, history = [] } = await req.json();
  const messages = [
    { role: "system" as const, content: "You are Kelly, the BuildAny AI agent. You help users build web and mobile apps." },
    ...history,
    { role: "user", content: message }
  ];
  const kellyRes = await fetch(`${HERMES_API_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${HERMES_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "deepseek-chat", messages, stream: false })
  });
  if (!kellyRes.ok) return new Response(`Kelly error: ${await kellyRes.text()}`, { status: 502 });
  const kellyData = await kellyRes.json();
  const reply = kellyData.choices?.[0]?.message?.content || "No response";
  const intent = detectBuildIntent(message);
  let toolResult = null;
  if (intent) {
    console.log('[Kelly] Build intent detected, creating project...');
    toolResult = await createProject(message, intent.platform, intent.name);
    console.log('[Kelly] Project created:', toolResult.id || toolResult.error);
  }
  return Response.json({
    reply,
    toolCalls: intent ? [{ function: { name: 'buildany_create_project', arguments: JSON.stringify(toolResult) } }] : undefined,
    toolResult,
    projectId: toolResult?.id || projectId
  });
}
