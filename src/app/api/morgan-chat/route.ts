import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { messages, projectContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    const systemPrompt = `You are Morgan, an expert AI builder for BuildAny. You help users build web and mobile apps.

Rules:
- Be concise and actionable
- Suggest code when relevant
- Focus on Next.js, React, Tailwind, TypeScript
- If user wants to build something, suggest they click the Build button
n- Use emojis for personality 🚀
${projectContext ? "\nCurrent project context: " + projectContext : ""}`;

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Morgan Chat] DeepSeek error:", error);
      return NextResponse.json({ error: "Morgan is thinking... try again!" }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "I'm Morgan! How can I help you build today? 🚀";

    return NextResponse.json({
      role: "assistant",
      content,
      model: "morgan",
    });

  } catch (error: any) {
    console.error("[Morgan Chat] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
