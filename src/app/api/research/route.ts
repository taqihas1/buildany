import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { llmRouter } from "@/lib/llm-router";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, query } = body;

    if (!projectId || !query) {
      return NextResponse.json(
        { error: "Missing projectId or query" },
        { status: 400 }
      );
    }

    const researchPrompt = `Research this topic for an app idea. Provide:
1. Target audience and their pain points
2. Top 3 competitors with their key features
3. Market gaps and opportunities
4. Recommended tech stack
5. Core features to build first (MVP)

Topic: ${query}`;

    const result = await llmRouter.generate({
      prompt: researchPrompt,
      systemPrompt: "You are a market research analyst specializing in app development. Provide concise, actionable insights.",
      provider: "deepseek",
      temperature: 0.8,
      maxTokens: 2000,
    });

    if (!result.success || !result.content) {
      return NextResponse.json(
        { error: result.error || "Research failed" },
        { status: 500 }
      );
    }

    // Save research to conversation
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId,
      role: "assistant",
      content: `## Research Results\n\n${result.content}`,
      model: `${result.provider}/${result.model}`,
      tokensUsed: result.tokensUsed,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      research: result.content,
      tokensUsed: result.tokensUsed,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error("Research error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
