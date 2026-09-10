import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversations, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { HarnessAgent } from "@/lib/harness/agent";
import { llmRouter } from "@/lib/llm-router";
import { detectToolNeed, extractToolParameters, executeToolForChat, generateAndExecuteTool } from "@/lib/self-improving-agent";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const history = await db.select().from(conversations).where(eq(conversations.projectId, id));
    return NextResponse.json({
      success: true,
      messages: history.map(h => ({ role: h.role, content: h.content, createdAt: h.createdAt })),
    });
  } catch (error: any) {
    console.error("[Harness Chat GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { message, stream = false } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Save user message
    await db.insert(conversations).values({
      id: randomUUID(),
      projectId: id,
      role: "user",
      content: message,
    });

    // Get project info
    const project = await db.select().from(projects).where(eq(projects.id, id)).get();
    const agent = new HarnessAgent(id);

    // ─── STEP 1: Check if this is a tool request (Self-Improving Agent) ───
    const toolDetection = await detectToolNeed(message);

    if (toolDetection.shouldUseTool && toolDetection.toolName) {
      // Extract parameters and execute existing tool
      const parameters = await extractToolParameters(toolDetection.toolName, message);
      const result = await executeToolForChat(toolDetection.toolName, parameters);

      const responseText = result.success
        ? `🔧 **${toolDetection.toolName}**\n\n${result.message}`
        : `❌ Tool error: ${result.message}`;

      await db.insert(conversations).values({
        id: randomUUID(),
        projectId: id,
        role: "assistant",
        content: responseText,
      });

      return NextResponse.json({
        success: true,
        response: responseText,
        toolUsed: toolDetection.toolName,
        mode: "tool",
      });
    }

    if (toolDetection.generateNew && toolDetection.need) {
      // Generate a new tool on the fly
      const context = project ? `Project: ${project.name} (${project.type})` : undefined;
      const repoParts = project?.githubRepo ? project.githubRepo.split("/") : [];
      const projectContext = {
        projectId: id,
        projectName: project?.name || "",
        projectType: project?.type || "",
        githubRepo: project?.githubRepo || "",
        githubOwner: repoParts[0] || "",
        githubRepoName: repoParts[1] || "",
        buildanyUrl: process.env.BUILDANY_URL || "https://base66.cloud",
        cloudflareToken: process.env.CLOUDFLARE_API_TOKEN || "",
        cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
        githubToken: process.env.GITHUB_TOKEN || "",
      };
      const result = await generateAndExecuteTool(toolDetection.need, context, projectContext);

      const responseText = result.success
        ? result.message
        : `❌ Failed to create tool: ${result.message}`;

      await db.insert(conversations).values({
        id: randomUUID(),
        projectId: id,
        role: "assistant",
        content: responseText,
      });

      return NextResponse.json({
        success: result.success,
        response: responseText,
        toolCreated: result.toolName,
        mode: "tool-generation",
      });
    }

    // ─── STEP 2: Classify intent (edit vs chat) ───
    const editKeywords = [
      "change", "update", "modify", "edit", "make", "add", "remove", "delete",
      "fix", "style", "color", "width", "height", "font", "size", "margin",
      "padding", "background", "border", "shadow", "gradient", "theme",
      "button", "header", "footer", "nav", "card", "layout", "page",
    ];
    const isEditRequest = editKeywords.some(kw => message.toLowerCase().includes(kw));

    let response: string;
    let fileChanges: Array<{ path: string; diff: string }> = [];

    if (isEditRequest) {
      // ─── EDIT MODE: Smart multi-file modification ───
      const allFiles = agent.getSourceFiles();
      
      if (allFiles.length === 0) {
        response = "No source files found to edit. Try building the app first!";
      } else {
        // Read all files to find the right one(s) to edit
        const fileContents: Record<string, string> = {};
        for (const f of allFiles.slice(0, 15)) {
          const content = agent.readFile(f);
          if (content) fileContents[f] = content;
        }

        // Ask LLM to identify which files need changes
        const identifyPrompt = `You are an expert React/Next.js developer. Analyze the user's request and identify which files need to be modified.

USER REQUEST: "${message}"

AVAILABLE FILES:
${Object.keys(fileContents).map(f => `- ${f}`).join('\n')}

For each file, briefly note if it likely needs changes for this request.
Then list ONLY the files that need modification, in order of priority.

Return your response in this exact format:
FILES_TO_EDIT: file1.tsx, file2.css
REASON: brief explanation`;

        const identifyResult = await llmRouter.generate({
          prompt: identifyPrompt,
          systemPrompt: "You identify which source files need modification for a given request. Be precise.",
          temperature: 0.1,
          maxTokens: 1000,
        });

        // Extract files to edit from LLM response
        const filesMatch = identifyResult.content?.match(/FILES_TO_EDIT:\s*([\w\/.\-,\s]+)/i);
        let filesToEdit = filesMatch ? filesMatch[1].split(',').map(f => f.trim()).filter(f => f) : [];
        
        // Fallback: if LLM didn't identify files, use page.tsx
        if (filesToEdit.length === 0) {
          const pageFile = allFiles.find(f => f.endsWith("page.tsx")) || allFiles[0];
          filesToEdit = [pageFile];
        }

        const changedFiles: string[] = [];
        
        for (const targetFile of filesToEdit.slice(0, 3)) { // Max 3 files per edit
          const currentContent = agent.readFile(targetFile);
          if (!currentContent) continue;

          // Generate modified code for this specific file
          const editPrompt = agent.buildEditPrompt(message, targetFile, currentContent);
          const result = await llmRouter.generate({
            prompt: editPrompt,
            systemPrompt: "You are Jason, an expert React/Next.js developer. Make precise, minimal edits. Return ONLY the complete modified file in a code block.",
            temperature: 0.2,
            maxTokens: 4000,
          });

          const newCode = agent.extractCode(result.content || "");
          if (newCode && newCode !== currentContent) {
            agent.writeFile(targetFile, newCode);
            changedFiles.push(targetFile);
            fileChanges.push({ 
              path: targetFile, 
              diff: `Updated ${targetFile} (${currentContent.length} → ${newCode.length} chars)` 
            });
          }
        }

        if (changedFiles.length > 0) {
          response = `✅ Updated ${changedFiles.length} file(s): ${changedFiles.join(', ')}`;
          
          // Trigger a rebuild so changes are visible
          try {
            const projectRecord = await db.select().from(projects).where(eq(projects.id, id)).get();
            if (projectRecord?.githubRepo) {
              // Fire-and-forget: trigger redeploy via GitHub push
              fetch(`${process.env.BUILDANY_URL || 'https://base66.cloud'}/api/tools/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: id }),
              }).catch(() => {});
            }
          } catch { /* ignore trigger errors */ }
        } else {
          response = "I understood your request but couldn't find files that need changing. Could you be more specific?";
        }
      }
    } else {
      // ─── CHAT MODE: Regular conversation ───
      const chatHistory = await db
        .select()
        .from(conversations)
        .where(eq(conversations.projectId, id))
        .orderBy(conversations.createdAt)
        .limit(20);

      const historyMessages = chatHistory.map(h => ({
        role: h.role === "user" ? "user" : "assistant",
        content: h.content,
      }));

      const result = await llmRouter.generate({
        prompt: message,
        systemPrompt: `You are Jason, an AI assistant for BuildAny. Help the user with their project.`,
        temperature: 0.7,
        maxTokens: 2000,
      });

      response = result.content || "I'm here to help! What would you like to do?";
    }

    // Save assistant response
    await db.insert(conversations).values({
      id: randomUUID(),
      projectId: id,
      role: "assistant",
      content: response,
    });

    return NextResponse.json({
      success: true,
      response,
      fileChanges,
      mode: isEditRequest ? "edit" : "chat",
    });

  } catch (error: any) {
    console.error("[Harness Chat POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
