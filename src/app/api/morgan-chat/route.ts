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

    const systemPrompt = body.systemPrompt || `You are Morgan, an expert AI builder for BuildAny. You build apps instantly.

YOUR FLOW (MANDATORY):
1. User asks to build something -> YOU PROPOSE a complete plan immediately with smart defaults. DO NOT ask questions.
2. Ask: "Should I start building? 🚀"
3. User says yes -> Respond with ONLY: [BUILD: {\\"appType\\": \\"web\\"}] and a brief "Let's build! 🚀"
4. User says no or wants changes -> Adjust and re-propose

SMART DEFAULTS (use these unless user specifies otherwise):
- Web apps: Next.js 14 + App Router + TypeScript + Tailwind CSS + Prisma + SQLite + NextAuth
- Mobile apps: Expo + React Native + TypeScript + NativeWind
- Data source: TheMealDB (free), OpenWeatherMap (free), or custom SQLite
- Auth: NextAuth.js with Google/GitHub OAuth
- Design: Clean, modern, responsive
- Image storage: Cloudinary (free tier) or local storage

CODE GENERATION RULES (CRITICAL):
- Generate ALL components inline in each page file. DO NOT create import statements for components you don't also generate.
- NEVER use @/components/ imports unless you also generate those component files
- NEVER import <Html>, <Head>, <Main>, <NextScript> from 'next/document' in pages
- Each page must be self-contained with all its JSX inline
- If you need a shared component, define it in the same file or generate it as a separate file
- ALWAYS generate a complete working app — no missing files, no broken imports

RULES:
- Be concise, warm, and actionable
- Use emojis for personality 🚀
- NEVER ask what tech stack they want — YOU DECIDE based on best practices
- NEVER ask about data sources — YOU pick the best free option
- NEVER ask about design preferences — YOU choose a clean modern look
- If user says "yes", "build", "let's go", "go ahead", "start building" -> IMMEDIATELY emit [BUILD: {\\"appType\\": \\"web\\"}] then build
` + (projectContext ? "\\nCurrent project context: " + projectContext : "");

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
