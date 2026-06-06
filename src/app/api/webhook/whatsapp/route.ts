import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, conversations } from "@/lib/db/schema";
import { analyzeProjectForDeployment } from "@/lib/deployment-orchestrator";

// POST /api/webhook/whatsapp - Receive WhatsApp messages via Twilio or similar
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from, message, mediaUrl } = body;

    console.log("📱 WhatsApp received:", { from, message: message?.slice(0, 100) });

    if (!message) {
      return NextResponse.json({ error: "No message content" }, { status: 400 });
    }

    // Extract prompt from message
    const prompt = message.trim();
    
    // Detect project type
    const type = detectProjectType(prompt);
    
    // Create project
    const projectId = crypto.randomUUID();
    const projectName = prompt.slice(0, 50).replace(/[^a-zA-Z0-9 ]/g, '');
    
    await db.insert(projects).values({
      id: projectId,
      userId: "whatsapp-user",
      name: projectName,
      description: prompt,
      type,
      status: "created",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add initial conversation
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId,
      role: "user",
      content: prompt,
      createdAt: new Date(),
    });

    // Get deployment recommendation
    const recommendation = await analyzeProjectForDeployment(projectId);

    // Build WhatsApp response
    const projectUrl = `https://base66.cloud/project/${projectId}`;
    
    const response = {
      success: true,
      projectId,
      projectUrl,
      reply: `✅ *BuildAny: Project Created!*\n\n*"${projectName}"* is being built by our AI swarm.\n\n🔗 ${projectUrl}\n\n🤖 Status: Agents working\n⏱️ ETA: 2-3 minutes\n\n📊 *Recommended:* ${recommendation.providerDisplay}\n_${recommendation.reason}_\n\n💡 *Why this platform?*\n${recommendation.valueProposition.slice(0, 3).join('\n')}\n\nYou'll get updates as we build! 🚀`,
      recommendation: {
        provider: recommendation.provider,
        display: recommendation.providerDisplay,
        reason: recommendation.reason,
        freeTier: recommendation.freeTier,
        estimatedTime: recommendation.estimatedTime,
      }
    };

    // In production, send this via WhatsApp API (Twilio, etc.)
    // For now, return the response structure
    console.log("📤 WhatsApp reply prepared:", response.reply.slice(0, 200));

    return NextResponse.json(response);
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
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
  if (t.includes('web') || t.includes('website') || t.includes('site') || t.includes('landing')) {
    return 'web';
  }
  return 'web';
}
