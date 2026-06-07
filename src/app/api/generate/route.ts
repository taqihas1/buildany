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

    // Save research to DB directly (not via API call)
    if (researchResult && researchResult.content) {
      try {
        const { conversations } = await import('@/lib/db/schema');
        await db.insert(conversations).values({
          id: crypto.randomUUID(),
          projectId: project.id,
          role: 'system',
          content: 'RESEARCH REPORT:\n' + JSON.stringify({
            content: researchResult.content,
            competitors: [
              { name: 'Competitor 1', rating: 4.5, keyFeatures: researchResult.keyFeatures?.slice(0,3) || [] },
              { name: 'Competitor 2', rating: 4.0, keyFeatures: researchResult.keyFeatures?.slice(3,6) || [] },
              { name: 'Competitor 3', rating: 3.5, keyFeatures: researchResult.keyFeatures?.slice(6,9) || [] },
            ],
            keyFeatures: researchResult.keyFeatures || [],
            gaps: researchResult.gaps || [],
            uxPatterns: ['Mobile-first design', 'Intuitive navigation', 'Real-time updates'],
            userComplaints: ['Complex setup', 'Slow performance', 'Limited customization'],
            targetAudience: 'General users',
            techStack: 'React, Next.js, TypeScript',
            monetization: 'Freemium',
            designTrends: ['Minimalist', 'Dark mode', 'Micro-interactions'],
          }),
          model: 'research-system',
          createdAt: new Date(),
        });
        console.log("Research saved to DB");
      } catch (err) {
        console.error("Research save failed (non-blocking):", err);
      }
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

    // Save AI response to conversation (SUMMARY only, not full code)
    const fileList = files.map(f => f.path).join(', ');
    const summaryMessage = `✅ Code generated successfully! Created ${files.length} file${files.length !== 1 ? 's' : ''}: ${fileList}. Click the "Code" tab to view and edit.`;
    
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId: project.id,
      role: "assistant",
      content: summaryMessage,
      model: `${result.provider}/${result.model}`,
      tokensUsed: result.tokensUsed,
      createdAt: new Date(),
    });

    // Auto-decompose into tasks
    let tasksCreated = [];
    let agentsCreated = [];
    try {
      const { decomposeProject, matchAgentToTask } = await import('@/app/api/decompose/decompose-logic');
      const { tasks: taskDefs } = decomposeProject(project.description || prompt, type, files);
      
      // Import schema
      const { tasks, agents } = await import('@/lib/db/schema');
      
      // Create default agents based on task types
      const taskTypes = [...new Set(taskDefs.map((t: any) => t.type || 'code'))] as string[];
      agentsCreated = await Promise.all(taskTypes.map(async (taskType: string, i: number) => {
        const agentId = crypto.randomUUID();
        const agentName = `${taskType.charAt(0).toUpperCase() + taskType.slice(1)} Agent`;
        await db.insert(agents).values({
          id: agentId,
          name: agentName,
          type: taskType,
          status: 'ready',
          capabilities: JSON.stringify([taskType, 'build', 'test']),
          metadata: JSON.stringify({ projectId: project.id, userId: userId }),
          createdAt: new Date(),
        });
        return { id: agentId, name: agentName, type: taskType };
      }));
      
      // Create tasks and assign to agents
      for (const taskDef of taskDefs) {
        const taskId = crypto.randomUUID();
        // Infer task type from title
        const taskTitle = taskDef.title.toLowerCase();
        const taskType = taskTitle.includes('css') || taskTitle.includes('style') ? 'css' :
                         taskTitle.includes('javascript') || taskTitle.includes('js') ? 'javascript' :
                         taskTitle.includes('html') ? 'html' :
                         taskTitle.includes('test') ? 'test' :
                         'code';
        
        // Find matching agent
        const matchingAgent = agentsCreated.find((a: any) =>
          a.type === taskType || 
          (taskType === 'css' && a.type === 'css') ||
          (taskType === 'javascript' && a.type === 'javascript') ||
          (taskType === 'html' && a.type === 'html') ||
          (taskType === 'test' && a.type === 'test')
        ) || agentsCreated[0];
        
        await db.insert(tasks).values({
          id: taskId,
          projectId: project.id,
          agentId: matchingAgent?.id || null,
          parentTaskId: null,
          type: taskType,
          status: 'pending',
          priority: taskDef.priority === 'high' ? 5 : taskDef.priority === 'medium' ? 3 : 1,
          title: taskDef.title,
          description: taskDef.description,
          input: JSON.stringify({ dependencies: taskDef.dependencies || [], agentName: matchingAgent?.name }),
          output: null,
          errorLog: null,
          attempts: 0,
          maxAttempts: 3,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
        });
        tasksCreated.push({ id: taskId, title: taskDef.title, agentId: matchingAgent?.id, agentName: matchingAgent?.name });
      }
      
      console.log(`Auto-decomposed into ${tasksCreated.length} tasks with ${agentsCreated.length} agents`);
    } catch (err) {
      console.error("Auto-decomposition failed (non-blocking):", err);
    }

    // Auto-generate preview for web projects
    if (type === 'web' && files.length > 0) {
      try {
        const htmlFile = files.find((f: any) => f.path.endsWith('.html') || f.path === 'index.html');
        const cssFiles = files.filter((f: any) => f.path.endsWith('.css'));
        const jsFiles = files.filter((f: any) => f.path.endsWith('.js'));
        
        let previewContent = '';
        
        if (htmlFile) {
          // Use the HTML file directly but inject CSS and JS
          previewContent = htmlFile.content;
          
          // Inject CSS files
          for (const css of cssFiles) {
            if (!previewContent.includes(css.path)) {
              const styleTag = `<style>\n${css.content}\n</style>`;
              previewContent = previewContent.replace('</head>', `${styleTag}\n</head>`);
            }
          }
          
          // Inject JS files
          for (const js of jsFiles) {
            if (!previewContent.includes(js.path)) {
              const scriptTag = `<script>\n${js.content}\n</script>`;
              previewContent = previewContent.replace('</body>', `${scriptTag}\n</body>`);
            }
          }
        } else {
          // Create a simple HTML wrapper
          previewContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  ${cssFiles.map((css: any) => `<style>${css.content}</style>`).join('\n')}
</head>
<body>
  <div id="app">
    <h1>${project.name}</h1>
    <p>${project.description || 'App preview'}</p>
    <div class="files-list">
      <h2>Generated Files:</h2>
      <ul>
        ${files.map((f: any) => `<li>${f.path}</li>`).join('')}
      </ul>
    </div>
  </div>
  ${jsFiles.map((js: any) => `<script>${js.content}</script>`).join('\n')}
</body>
</html>`;
        }
        
        // Save preview as a special file
        await db.insert(projectFiles).values({
          id: crypto.randomUUID(),
          projectId: project.id,
          path: '__preview.html',
          content: previewContent,
          language: 'html',
          isGenerated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log("Preview auto-generated");
      } catch (err) {
        console.error("Preview generation failed (non-blocking):", err);
      }
    }

    // Update project status
    await db
      .update(projects)
      .set({ status: files.length > 0 ? "generated" : "draft", updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    // Auto-generate wiki pages (direct DB, not API call)
    try {
      const { wikiPages } = await import('@/lib/db/schema');
      
      await db.insert(wikiPages).values({
        id: crypto.randomUUID(),
        projectId: project.id,
        pageType: 'overview',
        title: `${project.name} - Overview`,
        content: `# ${project.name}\n\n**Type:** ${project.type}\n**Status:** Generated\n\n## Description\n${project.description || 'No description provided.'}\n\n## Files Generated\n${files.map(f => `- \`${f.path}\``).join('\n')}\n\n## Architecture\nThis project was generated by BuildAny AI using ${result.provider}/${result.model}.\n\n## Next Steps\n- Preview the app in the Preview tab\n- Ask AI to modify or add features\n- Deploy when ready`,
        autoGenerated: true,
        createdAt: new Date(),
      });

      await db.insert(wikiPages).values({
        id: crypto.randomUUID(),
        projectId: project.id,
        pageType: 'adr',
        title: 'Architecture Decision: AI Generation',
        content: `# ADR-001: AI-Generated Code\n\n## Context\nThis project was auto-generated by BuildAny for rapid prototyping and validation.\n\n## Decision\nUse AI-generated vanilla HTML/CSS/JS for rapid prototyping and validation.\n\n## Consequences\n- Fast iteration cycles\n- Single-file deployment\n- Easy to modify via AI chat\n- May need refactoring for production scale`,
        autoGenerated: true,
        createdAt: new Date(),
      });
      
      console.log("Wiki pages auto-generated");
    } catch (err) {
      console.error("Wiki generation failed (non-blocking):", err);
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      files: savedFiles,
      filesGenerated: files.length,
      tasksCreated: tasksCreated.length,
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
