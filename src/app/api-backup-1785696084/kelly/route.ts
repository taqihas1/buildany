import { NextRequest, NextResponse } from "next/server";
import { executeTool, KELLY_TOOLS } from "@/lib/kelly-tools";
import { buildSystemPrompt } from "@/lib/kelly-system";

const HERMES_API_URL = process.env.HERMES_API_URL || "http://127.0.0.1:8642";
const HERMES_API_KEY = process.env.HERMES_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, projectId, history = [], stream = false } = body;
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    const systemPrompt = await buildSystemPrompt({ projectId });
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];
    const llmResponse = await callLLM(messages, stream);
    if (stream) {
      return new Response("Streaming not yet implemented", { status: 501 });
    }
    const choice = llmResponse.choices?.[0];
    const assistantMessage = choice?.message;
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (tc: any) => {
          try {
            const args = JSON.parse(tc.function.arguments);
            const result = await executeTool(tc.function.name, args);
            return { tool_call_id: tc.id, role: "tool" as const, content: JSON.stringify(result) };
          } catch (err: any) {
            return { tool_call_id: tc.id, role: "tool" as const, content: JSON.stringify({ error: err.message }) };
          }
        })
      );
      const followUpMessages = [...messages, assistantMessage, ...toolResults];
      const finalResponse = await callLLM(followUpMessages, false);
      const finalContent = finalResponse.choices?.[0]?.message?.content || "Done.";
      return NextResponse.json({
        reply: finalContent,
        toolCalls: assistantMessage.tool_calls.map((tc: any) => ({
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })),
        toolResults: toolResults.map((tr: any) => ({ tool: tr.tool_call_id, result: JSON.parse(tr.content) })),
        projectId,
      });
    }
    return NextResponse.json({ reply: assistantMessage?.content || "No response.", projectId });
  } catch (e: any) {
    console.error("[Kelly] Error:", e);
    return NextResponse.json({ error: "Kelly processing failed", details: e.message }, { status: 500 });
  }
}

async function callLLM(messages: any[], stream: boolean): Promise<any> {
  const useHermes = HERMES_API_KEY && HERMES_API_URL;
  const url = useHermes ? `${HERMES_API_URL}/v1/chat/completions` : `${DEEPSEEK_BASE_URL}/chat/completions`;
  const authHeader = useHermes ? `Bearer ${HERMES_API_KEY}` : `Bearer ${DEEPSEEK_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-v4-pro",
      messages,
      tools: KELLY_TOOLS,
      tool_choice: "auto",
      temperature: 0.7,
      stream,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`LLM error ${res.status}: ${errorText}`);
  }
  if (stream) return res;
  return await res.json();
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    agent: "kelly",
    version: "2.0",
    architecture: "unified",
    tools: KELLY_TOOLS.map((t) => ({ name: t.function.name, description: t.function.description })),
  });
}
