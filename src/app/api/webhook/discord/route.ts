import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, conversations } from "@/lib/db/schema";
import { analyzeProjectForDeployment } from "@/lib/deployment-orchestrator";

// POST /api/webhook/discord - Receive Discord slash commands or DMs
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, username, message, guildId, channelId } = body;

    console.log("🎮 Discord received:", { username, message: message?.slice(0, 100) });

    if (!message) {
      return NextResponse.json({ error: "No message content" }, { status: 400 });
    }

    // Extract prompt from message
    const prompt = message.trim();
    const type = detectProjectType(prompt);
    
    // Create project
    const projectId = crypto.randomUUID();
    const projectName = prompt.slice(0, 50).replace(/[^a-zA-Z0-9 ]/g, '');
    
    await db.insert(projects).values({
      id: projectId,
      userId: `discord-${userId}`,
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

    return NextResponse.json({
      success: true,
      projectId,
      projectUrl,
      reply: {
        content: `🚀 **BuildAny: Project Created!**\n\n**"${projectName}"** is being built by our AI swarm.\n\n🔗 ${projectUrl}\n\n🤖 Status: Agents working\n⏱️ ETA: 2-3 minutes\n\n📊 **Recommended Deploy:** ${recommendation.providerDisplay}\n_${recommendation.reason}_\n\n${recommendation.valueProposition.slice(0, 3).join('\n')}\n\nYou'll get updates here as we build!`,
        embeds: [{
          title: "Project Details",
          fields: [
            { name: "Type", value: type, inline: true },
            { name: "Deploy Platform", value: recommendation.providerDisplay, inline: true },
            { name: "Deploy Time", value: recommendation.estimatedTime, inline: true },
            { name: "Free Tier", value: recommendation.freeTier, inline: false },
          ],
          color: 0x3b82f6,
          timestamp: new Date().toISOString(),
        }]
      },
      recommendation: {
        provider: recommendation.provider,
        display: recommendation.providerDisplay,
        reason: recommendation.reason,
        freeTier: recommendation.freeTier,
        estimatedTime: recommendation.estimatedTime,
      }
    });
  } catch (error) {
    console.error("Discord webhook error:", error);
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
