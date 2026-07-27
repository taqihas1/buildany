import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { randomUUID } from "crypto";

// Use DeepSeek directly as fallback if Hermes is not configured
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const HERMES_URL = process.env.HERMES_URL || "";
const HERMES_API_KEY = process.env.HERMES_API_KEY || "";
const MODEL = process.env.HERMES_MODEL || "deepseek-v4-pro";

const KELLY_SYSTEM_PROMPT = `You are Kelly, the AI architect and builder for BuildAny. You help users build web apps, mobile apps, and dashboards.

Rules:
- Be concise and actionable
- Suggest code when relevant
- Focus on Next.js, React, Tailwind, TypeScript
- If user wants to build something, ask clarifying questions then say "Should I start building?"
- When user confirms building, emit [BUILD: start] to trigger generation
- Use emojis for personality 🚀`;

interface ChatRequest {
  message: string;
  projectId?: string;
  history?: Array<{ role: string; content: string }>;
}

function safeJsonParse(text: string, fallback: any = {}): any {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function executeTool(name: string, args: any, userId: string): Promise<any> {
  if (name === "buildany_create_project") {
    if (!args.name || typeof args.name !== "string") {
      return { success: false, error: "Missing or invalid name argument" };
    }
    const pid = randomUUID();
    try {
      await db.insert(projects).values({
        id: pid,
        userId,
        name: args.name,
        description: args.description || "",
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

async function callDeepSeek(messages: any[]): Promise<any | null> {
  if (!DEEPSEEK_KEY) {
    console.error("[Kelly] DeepSeek API key not configured");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    const rawText = await response.text();
    if (!response.ok) {
      console.error("[Kelly] DeepSeek error:", response.status, rawText.slice(0, 500));
      return null;
    }

    return safeJsonParse(rawText);
  } catch (err) {
    console.error("[Kelly] DeepSeek fetch error:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user (graceful fallback to guest)
    let userId: string;
    try {
      const authData = await auth();
      userId = authData.userId || "guest-" + crypto.randomUUID();
    } catch {
      userId = "guest-" + crypto.randomUUID();
    }

    const text = await req.text();
    if (text.length > 1024 * 100) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const body: ChatRequest = safeJsonParse(text, {});
    const { message, projectId, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // Validate history
    const MAX_HISTORY = 50;
    const MAX_CONTENT_LENGTH = 4000;
    const validHistory = (Array.isArray(history) ? history : [])
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          m.content &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
      )
      .slice(-MAX_HISTORY)
      .map((m) => ({
        ...m,
        content: m.content.slice(0, MAX_CONTENT_LENGTH),
      }));

    const messages = [
      { role: "system" as const, content: KELLY_SYSTEM_PROMPT },
      ...validHistory,
      { role: "user" as const, content: message },
    ];

    // Call DeepSeek
    const data = await callDeepSeek(messages);
    if (!data) {
      return NextResponse.json(
        { success: false, error: "AI service temporarily unavailable. Check DEEPSEEK_API_KEY." },
        { status: 502 }
      );
    }

    const reply = data.choices?.[0]?.message?.content || "";
    const tcs = data.choices?.[0]?.message?.tool_calls || [];

    let toolResults: any[] = [];
    
    if (Array.isArray(tcs) && tcs.length > 0) {
      for (const tc of tcs) {
        let args = {};
        try {
          args = JSON.parse(tc.function?.arguments || "{}");
        } catch {}
        const result = await executeTool(tc.function?.name, args, userId);
        toolResults.push({
          toolCallId: tc.id,
          toolName: tc.function?.name,
          result,
        });
      }
    }

    let finalReply = reply;
    if (toolResults.length > 0) {
      const toolMessages = toolResults.map((tr) => ({
        role: "tool" as const,
        content: JSON.stringify(tr.result),
        tool_call_id: tr.toolCallId,
      }));

      const secondData = await callDeepSeek([
        ...messages,
        { role: "assistant" as const, content: reply, tool_calls: tcs },
        ...toolMessages,
      ]);

      if (secondData) {
        finalReply = secondData.choices?.[0]?.message?.content || reply;
      }
    }

    return NextResponse.json({
      success: true,
      reply: finalReply,
      response: finalReply,
      toolCalls: tcs,
      toolResults,
      projectId: toolResults[0]?.result?.id || projectId,
    });
  } catch (error) {
    console.error("[Kelly Chat] Error:", error);
    return NextResponse.json(
      { success: false, error: "An internal error occurred" },
      { status: 500 }
    );
  }
}
