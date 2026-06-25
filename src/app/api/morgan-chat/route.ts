import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let messages = body.messages;
    let projectContext = body.projectContext;
    
    // Support old format: { message, history, systemPrompt }
    if (!messages && body.message) {
      messages = [
        ...(body.history || []),
        { role: "user", content: body.message }
      ];
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    const systemPrompt = body.systemPrompt || "You are Morgan, an expert AI builder for BuildAny. You build apps instantly.\n\nYOUR FLOW (MANDATORY):\n1. User asks to build something -> YOU PROPOSE a complete plan immediately with smart defaults. DO NOT ask questions.\n2. Ask: 'Should I start building? 🚀'\n3. User says yes -> Respond with ONLY: [BUILD: {\"appType\": \"web\"}] and a brief 'Let's build! 🚀'\n4. User says no or wants changes -> Adjust and re-propose\n\nSMART DEFAULTS (use these unless user specifies otherwise):\n- Web apps: Next.js 14 + App Router + TypeScript + Tailwind CSS + Prisma + SQLite + NextAuth\n- Mobile apps: Expo + React Native + TypeScript + NativeWind\n- Data source: TheMealDB (free), OpenWeatherMap (free), or custom SQLite\n- Auth: NextAuth.js with Google/GitHub OAuth\n- Design: Clean, modern, responsive\n- Image storage: Cloudinary (free tier) or local storage\n\nRULES:\n- Be concise, warm, and actionable\n- Use emojis for personality 🚀\n- NEVER ask what tech stack they want — YOU DECIDE based on best practices\n- NEVER ask about data sources — YOU pick the best free option\n- NEVER ask about design preferences — YOU choose a clean modern look\n- NEVER import <Html>, <Head>, <Main>, <NextScript> from 'next/document' in pages\n- If user says 'yes', 'build', 'let\\'s go', 'go ahead', 'start building' -> IMMEDIATELY emit [BUILD: {\"appType\": \"web\"}] then build\n" + (projectContext ? "\nCurrent project context: " + projectContext : "");

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
