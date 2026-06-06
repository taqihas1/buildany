import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, conversations } from "@/lib/db/schema";
import { analyzeProjectForDeployment } from "@/lib/deployment-orchestrator";

// POST /api/webhook/telegram - Receive Telegram messages via bot webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Telegram webhook format: { message: { chat: { id }, from: { id, username }, text } }
    const message = body.message || body.callback_query?.message;
    const chatId = message?.chat?.id;
    const fromId = message?.from?.id;
    const username = message?.from?.username || message?.from?.first_name || "User";
    const text = message?.text || body.callback_query?.data || "";

    console.log("📱 Telegram received:", { username, text: text?.slice(0, 100) });

    if (!text) {
      return NextResponse.json({ error: "No message content" }, { status: 400 });
    }

    // Handle /start command
    if (text === "/start") {
      return NextResponse.json({
        method: "sendMessage",
        chat_id: chatId,
        text: `🚀 *BuildAny Bot*\n\nSend me a prompt like:\n"Build a fitness tracking app"\n"Create a landing page for my bakery"\n"Make a recipe app with AI images"\n\nI'll create your project and send you the live link!`,
        parse_mode: "Markdown",
      });
    }

    // Extract prompt
    const prompt = text.trim();
    const type = detectProjectType(prompt);
    
    // Create project
    const projectId = crypto.randomUUID();
    const projectName = prompt.slice(0, 50).replace(/[^a-zA-Z0-9 ]/g, '');
    
    await db.insert(projects).values({
      id: projectId,
      userId: `telegram-${fromId}`,
      name: projectName,
      description: prompt,
      type,
      status: "created",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId,
      role: "user",
      content: prompt,
      createdAt: new Date(),
    });

    const recommendation = await analyzeProjectForDeployment(projectId);
    const projectUrl = `https://base66.cloud/project/${projectId}`;

    // Telegram reply format (Bot API compatible)
    return NextResponse.json({
      method: "sendMessage",
      chat_id: chatId,
      text: `🚀 *BuildAny: Project Created!*\n\n*"${projectName}"* is being built by our AI swarm.\n\n🔗 [View Project](${projectUrl})\n\n🤖 Status: Agents working\n⏱️ ETA: 2-3 minutes\n\n📊 *Recommended Deploy:* ${recommendation.providerDisplay}\n_${recommendation.reason}_\n\n💡 *Why this platform?*\n${recommendation.valueProposition.slice(0, 3).join('\n')}\n\nYou'll get updates here as we build!`,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function detectProjectType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('mobile') || t.includes('app') || t.includes('ios') || t.includes('android') || t.includes('react native')) {
    return 'mobile';
  }
  return 'web';
}
