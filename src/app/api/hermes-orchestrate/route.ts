import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, projectFiles, conversations, wikiPages } from "@/lib/db/schema";
import { generateShortName } from "@/lib/project-name-generator";
import { eq } from "drizzle-orm";

const HERMES_URL = "http://127.0.0.1:8642/v1/chat/completions";
const HERMES_API_KEY = "820a8890e58dfd3dadd4166cb2be9b8c4db1afce6514110039374ea1da7b84cc";
const HERMES_MODEL = "deepseek-chat";

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
async function generateProjectInBackground(
  projectId: string,
  prompt: string,
  type: string,
  projectName: string
) {
  try {
    console.log("[Kelly BG] Starting generation for project:", projectId);

    // Step 1: Generate research + specs + plan (fast - 30s timeout)
    const planResult = await generatePlan(projectId, prompt, type);
    if (!planResult) {
      await markFailed(projectId, "Failed to generate project plan (timeout or API error)");
      return;
    }

    // Update project name if Kelly generated a better one
    if (planResult.projectName) {
      await db.update(projects)
        .set({ name: planResult.projectName, updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    }

    // Save research
    if (planResult.research) {
      await db.insert(conversations).values({
        id: crypto.randomUUID(),
        projectId,
        role: "system",
        content: `RESEARCH:\n${JSON.stringify(planResult.research, null, 2)}`,
        model: "hermes/research",
        createdAt: new Date(),
      });
    }

    // Save specs
    if (planResult.specs) {
      await db.insert(conversations).values({
        id: crypto.randomUUID(),
        projectId,
        role: "system",
        content: `SPECS:\n${JSON.stringify(planResult.specs, null, 2)}`,
        model: "hermes/specs",
        createdAt: new Date(),
      });
    }

    console.log("[Kelly BG] Plan saved. Generating files...");

    // Step 2: Generate code files (60s timeout for larger payload)
    const filesResult = await generateFiles(projectId, prompt, type, planResult);
    if (filesResult?.files?.length > 0) {
      for (const file of filesResult.files) {
        await db.insert(projectFiles).values({
          id: crypto.randomUUID(),
          projectId,
          path: file.path,
          content: file.content,
          createdAt: new Date(),
        });
      }
      console.log("[Kelly BG] Files saved:", filesResult.files.length);
    } else {
      console.log("[Kelly BG] No files generated (timeout or empty response)");
    }

    // Step 3: Generate tests (30s timeout)
    const testsResult = await generateTests(projectId, prompt, type, planResult);
    if (testsResult?.tests?.length > 0) {
      await db.insert(conversations).values({
        id: crypto.randomUUID(),
        projectId,
        role: "system",
        content: `TESTS:\n${JSON.stringify(testsResult.tests, null, 2)}`,
        model: "hermes/tests",
        createdAt: new Date(),
      });
    }

    // Step 4: Generate wiki (30s timeout)
    const wikiResult = await generateWiki(projectId, prompt, type, planResult);
    if (wikiResult?.wiki?.length > 0) {
      for (const page of wikiResult.wiki) {
        await db.insert(wikiPages).values({
          id: crypto.randomUUID(),
          projectId,
          title: page.title,
          content: page.content,
          createdAt: new Date(),
      pageType: "page",
        });
      }
    }

    // Step 5: Mark project as ready
    await db.update(projects)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    // Log completion
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId,
      role: "system",
      content: `✅ Project generation complete! ${filesResult?.files?.length || 0} files, ${testsResult?.tests?.length || 0} tests, ${wikiResult?.wiki?.length || 0} wiki pages created.`,
      model: "hermes/status",
      createdAt: new Date(),
    });

    console.log("[Kelly BG] Project complete:", projectId);

  } catch (error: any) {
    console.error("[Kelly BG] Background generation failed:", error);
    await markFailed(projectId, `Generation failed: ${error.message}`);
  }
}

// Generate plan (research + specs) - FAST call with 30s timeout
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
async function generateFiles(projectId: string, prompt: string, type: string, plan: any): Promise<any> {
  const filesPrompt = `You are Kelly, an expert React/Next.js developer. Generate the MOST IMPORTANT code files only.

Project: "${plan.projectName || prompt}"
Type: ${type}

Specs: ${JSON.stringify(plan.specs, null, 2)}

Return ONLY valid JSON with 3 KEY files:
{
  "files": [
    {
      "path": "src/app/page.tsx",
      "content": "..."
    }
  ]
}

Generate ONLY 3 essential files:
1. Main page (src/app/page.tsx)
2. Layout (src/app/layout.tsx)  
3. One key component (src/components/MainComponent.tsx)

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
        max_tokens: 6000,
      }),
    }, 120000); // 120 second timeout for file generation

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
async function generateTests(projectId: string, prompt: string, type: string, plan: any): Promise<any> {
  const testsPrompt = `Generate tests for this app: "${plan.projectName || prompt}"

Return ONLY valid JSON:
{
  "tests": [
    {
      "name": "...",
      "content": "..."
    }
  ]
}

Use Jest + React Testing Library. Return ONLY the JSON.`;

  try {
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
          { role: "user", content: testsPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    }, 30000);

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return parseHermesResponse(content);
  } catch (err: any) {
    console.error("[Kelly BG] Tests generation failed:", err.message);
    return null;
  }
}

// Generate wiki
async function generateWiki(projectId: string, prompt: string, type: string, plan: any): Promise<any> {
  const wikiPrompt = `Create wiki documentation for this app: "${plan.projectName || prompt}"

Return ONLY valid JSON:
{
  "wiki": [
    {
      "title": "Architecture",
      "content": "..."
    }
  ]
}

Include pages: Architecture, Features, API Reference, Deployment Guide. Return ONLY the JSON.`;

  try {
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
          { role: "user", content: wikiPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    }, 30000);

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return parseHermesResponse(content);
  } catch (err: any) {
    console.error("[Kelly BG] Wiki generation failed:", err.message);
    return null;
  }
}

// Mark project as failed
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
