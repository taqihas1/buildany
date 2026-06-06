import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { llmRouter, getSystemPromptForType, parseGeneratedCode } from "@/lib/llm-router";
import { db } from "@/lib/db";
import { projectFiles, projects, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId || "guest-" + crypto.randomUUID();

    const body = await req.json();
    const { projectId, prompt, type = "web", provider, stream = false, skipResearch = false } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 }
      );
    }

    let project;
    let researchResult = null;

    // If no projectId, create a new project
    if (!projectId) {
      const newProjectId = crypto.randomUUID();
      const projectName = prompt.split(".")[0].slice(0, 50); // First sentence, max 50 chars
      
      await db.insert(projects).values({
        id: newProjectId,
        userId,
        name: projectName || "Untitled Project",
        description: prompt,
        type: type as "web" | "mobile" | "dashboard",
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      project = await db.select().from(projects).where(eq(projects.id, newProjectId)).get();
    } else {
      // Verify project exists and belongs to user
      const existingProject = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (existingProject.length === 0) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      if (existingProject[0].userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      project = existingProject[0];
    }

    if (!project) {
      return NextResponse.json({ error: "Failed to create or find project" }, { status: 500 });
    }

    // Optional: Run research first
    if (!skipResearch) {
      try {
        const researchPrompt = `Research this app idea for competitive analysis. Provide:
1. Target audience and pain points
2. Top 3 competitors with key features
3. Market gaps and opportunities
4. Recommended tech stack
5. Core MVP features

App idea: ${prompt}`;

        const researchResponse = await llmRouter.generate({
          prompt: researchPrompt,
          systemPrompt: "You are a market research analyst specializing in app development. Provide concise, actionable insights in 3-5 bullet points per section.",
          provider: provider || "deepseek",
          temperature: 0.8,
          maxTokens: 2000,
        });

        if (researchResponse.success && researchResponse.content) {
          researchResult = {
            content: researchResponse.content,
            competitorCount: (researchResponse.content.match(/competitor/gi) || []).length,
            keyFeatures: researchResponse.content.match(/features?:?\s*([^.]+)/gi) || [],
            gaps: researchResponse.content.match(/gap|opportunity/gi) || [],
          };

          // Save research to research API (NOT as a project file - avoids showing in file tree)
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://base66.cloud'}/api/project/${project.id}/research`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: researchResponse.content }),
            });
          } catch (err) {
            console.error("Failed to save research via API (non-blocking):", err);
          }
        }
      } catch (err) {
        console.error("Research failed (non-blocking):", err);
      }
    }

    // Save user prompt to conversation
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId: project.id,
      role: "user",
      content: prompt,
      model: provider || "auto",
      createdAt: new Date(),
    });

    // Generate code
    const systemPrompt = getSystemPromptForType(type);
    const enhancedPrompt = researchResult 
      ? `Based on market research, build this app:\n\n${prompt}\n\nResearch insights:\n${researchResult.content}`
      : prompt;

    const result = await llmRouter.generate({
      prompt: enhancedPrompt,
      systemPrompt,
      provider,
      temperature: 0.7,
      maxTokens: 4000,
      stream: false,
    });

    if (!result.success || !result.content) {
      return NextResponse.json(
        { error: result.error || "Generation failed", projectId: project.id },
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
        projectId: project.id,
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
      projectId: project.id,
      role: "assistant",
      content: result.content,
      model: `${result.provider}/${result.model}`,
      tokensUsed: result.tokensUsed,
      createdAt: new Date(),
    });

    // Update project status
    await db
      .update(projects)
      .set({ status: files.length > 0 ? "generated" : "draft", updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    // Auto-generate wiki pages
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://base66.cloud'}/api/project/${project.id}/wiki`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: 'overview',
          title: `${project.name} - Overview`,
          content: `# ${project.name}

**Type:** ${project.type}
**Status:** Generated

## Description
${project.description || 'No description provided.'}

## Files Generated
${files.map(f => `- \`${f.path}\``).join('\n')}

## Architecture
This project was generated by BuildAny AI using ${result.provider}/${result.model}.

## Next Steps
- Preview the app in the Preview tab
- Ask AI to modify or add features
- Deploy when ready`,
        }),
      });

      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://base66.cloud'}/api/project/${project.id}/wiki`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: 'adr',
          title: 'Architecture Decision: AI Generation',
          content: `# ADR-001: AI-Generated Code

## Context
This project was auto-generated by BuildAny using LLM (${result.provider}/${result.model}).

## Decision
Use AI-generated vanilla HTML/CSS/JS for rapid prototyping and validation.

## Consequences
- Fast iteration cycles
- Single-file deployment
- Easy to modify via AI chat
- May need refactoring for production scale`,
        }),
      });
    } catch (err) {
      console.error("Wiki generation failed (non-blocking):", err);
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      files: savedFiles,
      tokensUsed: result.tokensUsed,
      provider: result.provider,
      model: result.model,
      research: researchResult,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
