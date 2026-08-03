import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { projects, projectFiles, conversations, wikiPages } from "@/lib/db/schema";
import { generateShortName } from "@/lib/project-name-generator";
import { eq } from "drizzle-orm";

const HERMES_URL = "https://api.deepseek.com/v1/chat/completions";
const HERMES_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const HERMES_MODEL = "deepseek-chat";
const PROJECTS_DIR = "/data/projects";

// Fetch with timeout helper
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
    const { prompt, type = "web", appType, userId } = body;
    const projectType = appType || type;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 1. CREATE PROJECT IMMEDIATELY (fast response)
    const newId = crypto.randomUUID();
    const shortName = generateShortName(prompt);

    await db.insert(projects).values({
      id: newId,
      userId: userId || "guest-" + crypto.randomUUID(),
      name: shortName,
      description: prompt,
      type: projectType as "web" | "mobile" | "dashboard",
      status: "creating",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Log user prompt immediately
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId: newId,
      role: "user",
      content: prompt,
      model: "user",
      createdAt: new Date(),
    });

    // 3. Log "creating" status
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId: newId,
      role: "system",
      content: "🚀 Project creation started. Kelly is generating your app...",
      model: "hermes/status",
      createdAt: new Date(),
    });

    console.log("[Kelly Orchestrate] Project created:", newId, "- Starting background generation");

    // 4. RETURN IMMEDIATELY - Don't wait for Kelly!
    // Fire off background generation without awaiting
    generateProjectInBackground(newId, prompt, projectType, shortName);

    return NextResponse.json({
      success: true,
      projectId: newId,
      projectName: shortName,
      status: "creating",
      message: `🚀 Project "${shortName}" creation started! Kelly is generating your app in the background.`,
    });

  } catch (error: any) {
    console.error("[Kelly Orchestrate] Error:", error);
    return NextResponse.json(
      { error: "Kelly orchestration failed", message: error.message },
      { status: 500 }
    );
  }
}

// BACKGROUND GENERATION - Runs after response is sent
async function saveFile(projectId: string, filePath: string, content: string) {
  const safePath = path.join(PROJECTS_DIR, projectId, filePath.replace(/^\//, ""));
  await fs.mkdir(path.dirname(safePath), { recursive: true });
  await fs.writeFile(safePath, content, "utf-8");
}

async function generateProjectInBackground(
  projectId: string,
  prompt: string,
  type: string,
  projectName: string
) {
  try {
    console.log("[Kelly BG] Starting CODE-ONLY generation for project:", projectId);

    // Step 1: Generate plan (fast - 30s timeout)
    const planResult = await generatePlan(projectId, prompt, type);
    if (!planResult) {
      await markFailed(projectId, "Failed to generate project plan (timeout or API error)");
      return;
    }

    if (planResult.projectName) {
      await db.update(projects)
        .set({ name: planResult.projectName, updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    }

    console.log("[Kelly BG] Plan done. Generating code files...");

    // Step 2: Generate code files ONLY
    const filesResult = await generateFiles(projectId, prompt, type, planResult);
    if (filesResult?.files?.length > 0) {
      for (const file of filesResult.files) {
        await saveFile(projectId, file.path, file.content);
      }
      console.log("[Kelly BG] Files saved:", filesResult.files.length);

      await db.update(projects)
        .set({ status: "ready", updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      await db.insert(conversations).values({
        id: crypto.randomUUID(),
        projectId,
        role: "system",
        content: "✅ App generated! " + (filesResult.files.length || 0) + " files created.",
        model: "hermes/status",
        createdAt: new Date(),
      });
    } else {
      await markFailed(projectId, "No files generated (timeout or empty response)");
    }

    console.log("[Kelly BG] Project complete:", projectId);

  } catch (error: any) {
    console.error("[Kelly BG] Background generation failed:", error);
    await markFailed(projectId, error.message || "Unknown error");
  }
}

async function generatePlan(projectId: string, prompt: string, type: string): Promise<any> {
  const planPrompt = `You are Kelly, an expert software architect. Create a detailed plan for this app idea.

App idea: "${prompt}"
Type: ${type}

Return ONLY valid JSON with this structure:
{
  "projectName": "Short catchy name (2-3 words)",
  "description": "One sentence",
  "research": {
    "targetAudience": "...",
    "painPoints": ["..."],
    "competitors": [{"name": "...", "features": ["..."]}],
    "marketGaps": ["..."],
    "coreFeatures": ["..."]
  },
  "specs": {
    "userStories": ["As a user..."],
    "dataModels": [{"name": "...", "fields": ["..."]}],
    "apiEndpoints": [{"method": "GET", "path": "...", "description": "..."}],
    "uiComponents": ["..."]
  }
}

Keep it concise but complete. Return ONLY the JSON.`;

  try {
    console.log("[Kelly BG] Calling plan generation...");
    const response = await fetchWithTimeout(HERMES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HERMES_API_KEY}`,
      },
      body: JSON.stringify({
        model: HERMES_MODEL,
        messages: [
          { role: "system", content: "Return ONLY valid JSON." },
          { role: "user", content: planPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    }, 30000); // 30 second timeout

    if (!response.ok) {
      console.error("[Kelly BG] Plan API error:", response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log("[Kelly BG] Plan response length:", content.length);
    return parseHermesResponse(content);
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error("[Kelly BG] Plan generation timed out (30s)");
    } else {
      console.error("[Kelly BG] Plan generation failed:", err.message);
    }
    return null;
  }
}

// Generate code files - 90s timeout, fewer files for reliability
async function generateFiles(projectId: string, prompt: string, type: string, plan?: any): Promise<any> {
  const filesPrompt = `You are Kelly, an expert React/Next.js developer. Generate the MOST IMPORTANT code files only.

Project: "${prompt}"
Type: ${type}

Return ONLY valid JSON with 3 KEY files:
{
  "files": [
    {
      "path": "src/app/page.tsx",
      "content": "..."
    }
  ]
}

Generate a COMPLETE file structure with at least 6-8 files:
1. src/app/page.tsx - Main page with routing/layout
2. src/app/layout.tsx - Root layout with metadata
3. src/app/globals.css - Global styles
4. src/components/Dashboard.tsx - Dashboard with stats
5. src/components/WorkoutPlan.tsx - Workout plan builder
6. src/components/ProgressChart.tsx - Progress charts
7. src/components/SocialFeed.tsx - Social feed
8. src/components/Auth.tsx - Login/register forms

Use TypeScript, React, Next.js App Router, Tailwind CSS. Keep code concise but complete. Return ONLY the JSON.`;

  try {
    console.log("[Kelly BG] Calling file generation...");
    const response = await fetchWithTimeout(HERMES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HERMES_API_KEY}`,
      },
      body: JSON.stringify({
        model: HERMES_MODEL,
        messages: [
          { role: "system", content: "Return ONLY valid JSON." },
          { role: "user", content: filesPrompt },
        ],
        temperature: 0.2,
        max_tokens: 8000,
      }),
    }, 150000); // 150 second timeout for file generation

    if (!response.ok) {
      console.error("[Kelly BG] Files API error:", response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log("[Kelly BG] Files response length:", content.length);
    return parseHermesResponse(content);
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error("[Kelly BG] File generation timed out (120s)");
    } else {
      console.error("[Kelly BG] Files generation failed:", err.message);
    }
    return null;
  }
}

// Generate tests
async function markFailed(projectId: string, reason: string) {
  try {
    await db.update(projects)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId,
      role: "system",
      content: `❌ ${reason}`,
      model: "hermes/status",
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[Kelly BG] Failed to mark project as failed:", err);
  }
}

// Parse JSON from Kelly response
function parseHermesResponse(content: string): any {
  try {
    let jsonContent = content;

    // Try to find JSON between code blocks
    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1];
    } else {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }
    }

    jsonContent = jsonContent.trim();
    return JSON.parse(jsonContent);
  } catch (err) {
    console.error("[Kelly BG] JSON parse error:", err);
    console.log("[Kelly BG] Content attempted:", content.substring(0, 500));
    return null;
  }
}
