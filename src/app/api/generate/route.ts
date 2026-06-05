import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { llmRouter, getSystemPromptForType, parseGeneratedCode } from "@/lib/llm-router";
import { db } from "@/lib/db";
import { projectFiles, projects, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, prompt, type = "web", provider, stream = false } = body;

    if (!projectId || !prompt) {
      return NextResponse.json(
        { error: "Missing projectId or prompt" },
        { status: 400 }
      );
    }

    // Verify project exists and belongs to user
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project[0].userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Save user prompt to conversation
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId,
      role: "user",
      content: prompt,
      model: provider || "auto",
      createdAt: new Date(),
    });

    // Generate code
    const systemPrompt = getSystemPromptForType(type);
    const result = await llmRouter.generate({
      prompt,
      systemPrompt,
      provider,
      temperature: 0.7,
      maxTokens: 4000,
      stream: false,
    });

    if (!result.success || !result.content) {
      return NextResponse.json(
        { error: result.error || "Generation failed" },
        { status: 500 }
      );
    }

    // Parse generated code into files
    const files = parseGeneratedCode(result.content);

    // Save files to database
    const savedFiles = [];
    for (const file of files) {
      const fileId = crypto.randomUUID();
      await db.insert(projectFiles).values({
        id: fileId,
        projectId,
        path: file.path,
        content: file.content,
        language: file.language,
        isGenerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      savedFiles.push({
        id: fileId,
        path: file.path,
        language: file.language,
      });
    }

    // Save AI response to conversation
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId,
      role: "assistant",
      content: result.content,
      model: `${result.provider}/${result.model}`,
      tokensUsed: result.tokensUsed,
      createdAt: new Date(),
    });

    // Update project status
    await db
      .update(projects)
      .set({ status: "generated", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    return NextResponse.json({
      success: true,
      files: savedFiles,
      tokensUsed: result.tokensUsed,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
