import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { randomUUID } from "crypto";

const HERMES_URL = process.env.HERMES_URL || "http://127.0.0.1:8642/v1/chat/completions";
const HERMES_API_KEY = process.env.HERMES_API_KEY || "";
const MODEL = process.env.HERMES_MODEL || "deepseek-chat";

const KELLY_SYSTEM_PROMPT = "You are Kelly, the AI architect for BuildAny.";

interface ChatRequest {
  message: string;
  projectId?: string;
  history?: Array<{ role: string; content: string }>;
}

/**
 * Safely parse a JSON string, returning a default value on failure.
 * This prevents "Unexpected token" errors from crashing the app.
 */
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
      return { success: false, error: "Missing or invalid 'name' argument" };
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

/**
 * Fetch from Hermes API with safe JSON parsing.
 * Returns the parsed data or null on failure.
 */
async function fetchHermes(messages: any[]): Promise<{ data: any; rawText: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(HERMES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + HERMES_API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
      }),
      signal: controller.signal,
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error("Hermes API error:", response.status, rawText.slice(0, 500));
      return null;
    }

    // Safely parse the response - handle any content type
    const data = safeJsonParse(rawText);
    
    // If parsing failed but we got text, wrap it as a reply
    if (!data || Object.keys(data).length === 0) {
      return { data: { choices: [{ message: { content: rawText, tool_calls: [] } }] }, rawText };
    }

    return { data, rawText };
  } catch (err) {
    console.error("Hermes fetch error:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user via Clerk (graceful fallback to guest if Clerk not configured)
    let userId: string;
    try {
      const authData = await auth();
      userId = authData.userId || "guest-" + crypto.randomUUID();
    } catch {
      // Clerk middleware not configured, use guest ID
      userId = "guest-" + crypto.randomUUID();
    }

    // Limit request body size to 100KB to prevent memory exhaustion (DoS)
    const text = await req.text();
    if (text.length > 1024 * 100) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    // Safely parse the request body
    const body: ChatRequest = safeJsonParse(text, {});
    const { message, projectId, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // Validate API key
    if (!HERMES_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Hermes API key not configured" },
        { status: 500 }
      );
    }

    // Validate and limit history entries (max 50 entries, 4000 chars each)
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

    // First call to Hermes
    const hermesResult = await fetchHermes(messages);
    if (!hermesResult) {
      return NextResponse.json(
        { success: false, error: "AI service temporarily unavailable" },
        { status: 502 }
      );
    }

    const { data } = hermesResult;
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

      // Second call to Hermes with tool results
      const secondResult = await fetchHermes([
        ...messages,
        { role: "assistant" as const, content: reply, tool_calls: tcs },
        ...toolMessages,
      ]);

      if (secondResult) {
        finalReply = secondResult.data.choices?.[0]?.message?.content || reply;
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
    console.error("KELLY CHAT ERROR:", error);
    return NextResponse.json(
      { success: false, error: "An internal error occurred" },
      { status: 500 }
    );
  }
}
