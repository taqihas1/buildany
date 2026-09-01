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
      const result = await generateAndExecuteTool(toolDetection.need, context);

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
      // ─── EDIT MODE: Fast file modification ───
      const files = agent.getSourceFiles();
      const pageFile = files.find(f => f.endsWith("page.tsx")) || files[0];
      
      if (!pageFile) {
        response = "No source files found to edit. Try building the app first!";
      } else {
        const currentContent = agent.readFile(pageFile);
        if (!currentContent) {
          response = `Could not read ${pageFile}`;
        } else {
          // Generate modified code
          const prompt = agent.buildEditPrompt(message, pageFile, currentContent);
          const result = await llmRouter.generate({
            prompt,
            systemPrompt: "You are Jason, an expert React/Next.js developer. Make precise, minimal edits.",
            temperature: 0.2,
            maxTokens: 4000,
          });

          const newCode = agent.extractCode(result.content || "");
          if (newCode && newCode !== currentContent) {
            agent.writeFile(pageFile, newCode);
            
            // Compute simple diff preview
            const diffPreview = `Updated ${pageFile} (${currentContent.length} → ${newCode.length} chars)`;
            fileChanges.push({ path: pageFile, diff: diffPreview });
            
            response = `✅ Updated ${pageFile}!\n\nI ${message.toLowerCase().includes("remove") || message.toLowerCase().includes("delete") ? "removed" : "applied"} your changes. The file has been saved.`;
          } else {
            response = "I understood your request but couldn't generate valid changes. Could you be more specific?";
          }
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
