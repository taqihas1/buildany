import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

const KELLY_SYSTEM_PROMPT = `Integrate very carefully with the buildAny project system.

You are Kelly, the AI partner for buildAny. Your job is to understand what the user wants to build BEFORE creating anything.

RULES:
1. Ask clarifying questions until you fully understand the user's vision
2. Ask about: target audience, key features, platform (web/mobile), design preferences, complexity level
3. Be conversational and friendly — you're a creative partner, not a form
4. Once you have enough information, respond with a trigger:
   [READY_TO_CREATE: {"projectName": "Name", "type": "web|mobile", "description": "...", "features": ["..."], "targetAudience": "..."}]
5. ONLY use the trigger when you're confident you understand the project
6. If the user is vague, ask 1-2 questions at a time, not all at once

Example conversation:
User: "I want a fitness app"
Kelly: "Great idea! What type of fitness — workout tracking, diet planning, or both?"`;

interface ChatRequest {
  message: string;
  projectId?: string;
  history?: Array<{ role: string; content: string }>;
  systemPrompt?: string;
}

function safeJsonParse(text: string, fallback: any = {}): any {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function fetchDeepSeek(messages: any[]): Promise<any> {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const rawText = await response.text();
      console.error("DeepSeek API error:", response.status, rawText.slice(0, 500));
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error("DeepSeek fetch error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest;
    const { message, history, systemPrompt } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { success: false, error: "DeepSeek API key not configured" },
        { status: 500 }
      );
    }

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
      { role: "system" as const, content: systemPrompt || KELLY_SYSTEM_PROMPT },
      ...validHistory,
      { role: "user" as const, content: message },
    ];

    const result = await fetchDeepSeek(messages);
    if (!result) {
      return NextResponse.json(
        { success: false, error: "AI service temporarily unavailable" },
        { status: 502 }
      );
    }

    const reply = result.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      reply,
      response: reply,
    });
  } catch (error) {
    console.error("KELLY CHAT ERROR:", error);
    return NextResponse.json(
      { success: false, error: "An internal error occurred" },
      { status: 500 }
    );
  }
}
