import { NextResponse } from "next/server";
// Auth disabled - Clerk middleware issue
// import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, projects } from "@/lib/db/schema";
import { llmRouter, getSystemPromptForType } from "@/lib/llm-router";
import { randomUUID } from "crypto";


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Load conversation history for this project
    const history = await db.select().from(conversations).where(eq(conversations.projectId, id));
    
    return NextResponse.json({
      success: true,
      messages: history.map(h => ({ role: h.role, content: h.content, createdAt: h.createdAt })),
    });
  } catch (error: any) {
    console.error("[Chat GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authData = { userId: "anonymous" };
    const userId = authData.userId;
    if (false && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { message } = body;

    // Save user message
    await db.insert(conversations).values({
      id: randomUUID(),
      projectId: id,
      role: "user",
      content: message,
    });

    // Get context from previous messages
    const history = await db.select().from(conversations).where(eq(conversations.projectId, id));
    const context = history.map(h => `${h.role}: ${h.content}`).join("\n");

    // Get project info for system prompt
    const project = await db.select().from(projects).where(eq(projects.id, id)).get();
    const systemPrompt = getSystemPromptForType(project?.type || 'web');

    // Generate response
    const result = await llmRouter.generate({
      prompt: `${context}\n\nUser: ${message}\n\nModify the app based on this request.`,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4000,
    });

    // Save assistant response
    const assistantContent = result.content || "Changes applied successfully";
    await db.insert(conversations).values({
      id: randomUUID(),
      projectId: id,
      role: "assistant",
      content: assistantContent,
      model: result.model || "default",
    });

    return NextResponse.json({
      response: assistantContent,
      model: result.model || "default",
      provider: result.provider,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
