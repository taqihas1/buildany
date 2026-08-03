import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { projects, projectFiles, conversations } from "@/lib/db/schema";
import { generateShortName } from "@/lib/project-name-generator";
import { eq } from "drizzle-orm";

const HERMES_URL = "https://api.deepseek.com/v1/chat/completions";
const HERMES_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const HERMES_MODEL = "deepseek-chat";
const PROJECTS_DIR = "/data/projects";

// Tool definitions that Kelly can use
const KELLY_TOOLS = `
You are Kelly, an expert software architect and developer for BuildAny (base66.cloud).
You help users build apps by chatting with them, understanding their needs, and generating code.

## Your Flow
1. Chat with the user to understand what they want to build
2. Propose a plan with features and file structure
3. When user approves (says "build it", "yes", "go ahead", etc.), use the tools to create the project
4. Generate code files using your expertise
5. Ask if they want to preview/deploy

## Available Tools

When you need to use a tool, output ONLY a JSON block like this:

### create_project
Creates a new project and returns a projectId.
\`\`\`json
{"tool": "create_project", "params": {"name": "MyApp", "description": "A fitness tracking app"}}
\`\`\`

### save_file
Saves a code file to the project.
\`\`\`json
{"tool": "save_file", "params": {"projectId": "...", "filePath": "src/app/page.tsx", "content": "..."}}
\`\`\`

### get_files
Gets all files in a project.
\`\`\`json
{"tool": "get_files", "params": {"projectId": "..."}}
\`\`\`

### build_project
Builds the project (npm install + next build).
\`\`\`json
{"tool": "build_project", "params": {"projectId": "..."}}
\`\`\`

### deploy_project
Deploys to Cloudflare Pages.
\`\`\`json
{"tool": "deploy_project", "params": {"projectId": "..."}}
\`\`\`

## Rules
- ALWAYS use tools for project operations (create, save, build, deploy)
- Generate COMPLETE, working code - not placeholders
- Use TypeScript, React, Next.js App Router, Tailwind CSS
- Save files to src/app/ and src/components/ directories
- After saving all files, offer to build and deploy
- Be conversational and helpful!
`;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, projectId, messages = [], type = "web", appType } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // DIRECT_CREATION_MODE: If no chat history, do the old full creation+generation flow
    // This is what Workspace3Col expects
    const isDirectCreation = !messages || messages.length === 0;
    
    if (isDirectCreation) {
      console.log("[Hermes Orchestrate] DIRECT_CREATION_MODE for:", prompt.slice(0, 50));
      return await handleDirectCreation(prompt, type || appType || "web");
    }

    // CHAT_TOOL_MODE: New multi-tool chat flow
    // Build conversation history
    const conversationHistory = messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // Call Kelly with tool-aware system prompt
    const response = await fetchWithTimeout(HERMES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HERMES_API_KEY}`,
      },
      body: JSON.stringify({
        model: HERMES_MODEL,
        messages: [
          { role: "system", content: KELLY_TOOLS },
          ...conversationHistory,
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    }, 60000);

    if (!response.ok) {
      console.error("[Kelly Chat] API error:", response.status);
      return NextResponse.json({ error: "Kelly API error" }, { status: 500 });
    }

    const data = await response.json();
    const kellyResponse = data.choices?.[0]?.message?.content || "";

    // Check if Kelly wants to use tools
    const toolCalls = parseToolCalls(kellyResponse);
    
    if (toolCalls.length > 0) {
      console.log(`[Kelly Chat] ${toolCalls.length} tool call(s) detected`);
      const results = [];
      
      for (const toolCall of toolCalls) {
        console.log("[Kelly Chat] Executing:", toolCall.tool);
        const result = await executeTool(toolCall.tool, toolCall.params);
        results.push({
          tool: toolCall.tool,
          params: toolCall.params,
          result,
        });
      }
      
      return NextResponse.json({
        success: true,
        role: "assistant",
        content: kellyResponse,
        toolCalls: results,
      });
    }

    return NextResponse.json({
      success: true,
      role: "assistant",
      content: kellyResponse,
    });

  } catch (error: any) {
    console.error("[Kelly Chat] Error:", error);
    return NextResponse.json(
      { error: "Kelly chat failed", message: error.message },
      { status: 500 }
    );
  }
}

// Old direct-creation flow for backward compatibility with Workspace3Col
async function handleDirectCreation(prompt: string, type: string): Promise<NextResponse> {
  try {
    // Step 1: Create project via tools API
    const shortName = generateShortName(prompt);
    const createRes = await fetch("http://localhost:3000/api/tools/create-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: shortName, description: prompt }),
    });
    const createData = await createRes.json();
    
    if (!createData.success || !createData.projectId) {
      return NextResponse.json({ error: createData.error || "Project creation failed" }, { status: 500 });
    }
    
    const projectId = createData.projectId;
    console.log("[Direct Creation] Project created:", projectId);
    
    // Step 2: Generate code via /api/generate
    const genRes = await fetch("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        prompt,
        type,
        provider: "deepseek",
        skipResearch: true,
      }),
    });
    const genData = await genRes.json();
    console.log("[Direct Creation] Generate response:", genData.success, genData.projectId || genData.error);
    
    if (!genData.success && !genData.projectId) {
      return NextResponse.json({
        success: true,
        projectId,
        projectName: shortName,
        error: genData.error || "Code generation may have issues",
        files: [],
      });
    }
    
    // Step 3: Get files from disk
    const filesRes = await fetch(`http://localhost:3000/api/project-files?projectId=${projectId}`);
    const filesData = await filesRes.json();
    const files = filesData.files || [];
    
    return NextResponse.json({
      success: true,
      projectId,
      projectName: shortName,
      files,
      message: `Project created with ${files.length} files`,
    });
    
  } catch (error: any) {
    console.error("[Direct Creation] Error:", error);
    return NextResponse.json(
      { error: "Direct creation failed", message: error.message },
      { status: 500 }
    );
  }
}

// Parse ALL tool calls from Kelly's response
function parseToolCalls(content: string): Array<{ tool: string; params: any }> {
  const toolCalls: Array<{ tool: string; params: any }> = [];
  
  // Find all JSON code blocks with tool calls
  const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.tool && parsed.params) {
        toolCalls.push({ tool: parsed.tool, params: parsed.params });
      }
    } catch {
      // Try regex extraction for nested JSON
      const toolMatch = match[1].match(/"tool"\s*:\s*"(\w+)"/);
      const paramsMatch = match[1].match(/"params"\s*:\s*(\{[\s\S]*\})/);
      if (toolMatch && paramsMatch) {
        try {
          const params = JSON.parse(paramsMatch[1]);
          toolCalls.push({ tool: toolMatch[1], params });
        } catch {}
      }
    }
  }
  
  return toolCalls;
}

// Execute a tool call
async function executeTool(tool: string, params: any): Promise<any> {
  const baseUrl = "http://localhost:3000/api/tools";
  
  try {
    switch (tool) {
      case "create_project": {
        const res = await fetch(`${baseUrl}/create-project`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        return await res.json();
      }
      
      case "save_file": {
        const res = await fetch(`${baseUrl}/save-file`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        return await res.json();
      }
      
      case "get_files": {
        const res = await fetch(`${baseUrl}/get-files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        return await res.json();
      }
      
      case "build_project": {
        const res = await fetch(`${baseUrl}/build`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        return await res.json();
      }
      
      case "deploy_project": {
        const res = await fetch(`${baseUrl}/deploy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        return await res.json();
      }
      
      default:
        return { error: `Unknown tool: ${tool}` };
    }
  } catch (error: any) {
    return { error: error.message };
  }
}
