import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, conversations, agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateShortName } from "@/lib/project-name-generator";
import { llmRouter } from "@/lib/llm-router";
import fs from "fs";

const DEBUG_LOG = "/root/buildany/api-debug.log";
function debug(label: string, data: any) {
  const line = `[${new Date().toISOString()}] ${label}: ${JSON.stringify(data)}\n`;
  fs.appendFileSync(DEBUG_LOG, line);
}

export async function POST(req: NextRequest) {
  try {
    debug("REQUEST_START", { url: req.url, method: req.method, headers: Object.fromEntries(req.headers.entries()) });
    
    let userId: string;
    try {
      const authData = await auth();
      userId = authData.userId || "guest-" + crypto.randomUUID();
      debug("AUTH_OK", { userId });
    } catch (authError: any) {
      userId = "guest-" + crypto.randomUUID();
      debug("AUTH_FALLBACK", { userId, error: authError.message });
    }
    
    const body = await req.json();
    debug("BODY", body);
    
    const { projectId, prompt, type = "web", provider = "deepseek", skipResearch = false } = body;

    if (!prompt) {
      debug("ERROR", "Missing prompt");
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    let projectIdSafe: string;
    let researchResult = null;
    
    if (!projectId) {
      debug("CREATING_NEW_PROJECT", "No projectId provided");
      // Create new project
      const newId = crypto.randomUUID();
      const shortName = generateShortName(prompt);
      debug("GENERATED", { newId, shortName });
      
      if (!skipResearch) {
        try {
          const researchPrompt = `Research this app idea and provide structured JSON:
App Idea: ${prompt}
Platform: ${type}

Return ONLY valid JSON with:
- targetAudience: string
- painPoints: string[]
- competitors: array of {name, features, strengths, weaknesses}
- marketGaps: string[]
- techStack: string[]
- coreFeatures: string[]
- designTrends: string[]`;

          const researchResponse = await llmRouter.generate({
            prompt: researchPrompt,
            systemPrompt: "You are a market research analyst. Return ONLY valid JSON.",
            provider,
            temperature: 0.7,
            maxTokens: 2000,
          });

          if (researchResponse.success && researchResponse.content) {
            try {
              let jsonStr = researchResponse.content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
              researchResult = JSON.parse(jsonStr);
              debug("RESEARCH_OK", { hasResult: true });
            } catch (parseErr) {
              researchResult = { raw: researchResponse.content };
              debug("RESEARCH_PARSE_ERR", { error: (parseErr as Error).message });
            }
          }
        } catch (e) { 
          console.error("Research failed:", e); 
          debug("RESEARCH_FAILED", { error: (e as Error).message });
        }
      }
      
      debug("DB_INSERT_START", { newId, userId, shortName, prompt });
      try {
        await db.insert(projects).values({
          id: newId, userId, name: shortName, description: prompt,
          type: type as "web" | "mobile" | "dashboard",
          status: "generating", createdAt: new Date(), updatedAt: new Date(),
        });
        debug("DB_INSERT_OK", { newId });
      } catch (dbErr) {
        debug("DB_INSERT_ERROR", { error: (dbErr as Error).message, stack: (dbErr as Error).stack });
        throw dbErr;
      }
      
      const project = await db.select().from(projects).where(eq(projects.id, newId)).get();
      debug("DB_VERIFY", { found: !!project, projectId: project?.id });
      if (!project) {
        debug("ERROR", "Project creation failed - not found after insert");
        return NextResponse.json({ error: "Project creation failed" }, { status: 500 });
      }
      
      projectIdSafe = project.id;
      
      if (researchResult) {
        await db.insert(conversations).values({
          id: crypto.randomUUID(), projectId: newId, role: "system",
          content: `RESEARCH REPORT:\n${JSON.stringify(researchResult)}`,
          model: `${provider}/research`, createdAt: new Date(),
        });
      }
      
      // Create default agents for this project
      const agentDefs = [
        { name: 'Hermes-001', type: 'hermes', capabilities: JSON.stringify(['orchestrate', 'plan']) },
        { name: 'Code-Gen-001', type: 'code', capabilities: JSON.stringify(['react', 'nextjs', 'typescript']) },
        { name: 'Code-Gen-002', type: 'code', capabilities: JSON.stringify(['components', 'styling', 'animation']) },
        { name: 'Code-Gen-003', type: 'code', capabilities: JSON.stringify(['api', 'backend', 'database']) },
        { name: 'Tester-001', type: 'test', capabilities: JSON.stringify(['unit-test', 'integration-test']) },
        { name: 'Reviewer-001', type: 'review', capabilities: JSON.stringify(['code-review', 'security']) },
        { name: 'Deployer-001', type: 'deploy', capabilities: JSON.stringify(['docker', 'ci-cd']) },
      ];
      for (const def of agentDefs) {
        await db.insert(agents).values({
          id: crypto.randomUUID(), projectId: newId, name: def.name, type: def.type,
          status: 'idle', capabilities: def.capabilities, createdAt: new Date(),
        });
      }
    } else {
      // Use existing project
      const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
      projectIdSafe = project.id;
    }

    await db.insert(conversations).values({
      id: crypto.randomUUID(), projectId: projectIdSafe, role: "user",
      content: prompt, model: "user", createdAt: new Date(),
    });

    import("@/lib/orchestrator").then(({ HermesOrchestrator }) => {
      const hermes = new HermesOrchestrator(
        projectIdSafe, prompt, type as 'web' | 'mobile' | 'backend',
        (status) => {
          console.log("[Hermes]", status);
          // Send status to AI chat panel
          db.insert(conversations).values({
            id: crypto.randomUUID(),
            projectId: projectIdSafe,
            role: 'assistant',
            content: status,
            model: 'hermes-status',
            createdAt: new Date(),
          }).catch((err: any) => console.error("[Hermes] Failed to log status:", err));
        },
        (phase) => {
          console.log("[Hermes] phase:", phase);
          db.insert(conversations).values({
            id: crypto.randomUUID(),
            projectId: projectIdSafe,
            role: 'assistant',
            content: `Phase: ${phase}`,
            model: 'hermes-phase',
            createdAt: new Date(),
          }).catch((err: any) => console.error("[Hermes] Failed to log phase:", err));
        },
        (context) => {
          console.log("[Hermes] awaiting user:", context);
          db.insert(conversations).values({
            id: crypto.randomUUID(),
            projectId: projectIdSafe,
            role: 'assistant',
            content: `Awaiting user input: ${JSON.stringify(context)}`,
            model: 'hermes-awaiting',
            createdAt: new Date(),
          }).catch((err: any) => console.error("[Hermes] Failed to log awaiting:", err));
        },
        {}, // config (default)
        researchResult, // research data
      );
      hermes.start().catch((err: any) => console.error("Hermes start error:", err));
    }).catch((err) => console.error("Failed to load orchestrator:", err));

    debug("RESPONSE", { success: true, projectId: projectIdSafe, hasResearch: !!researchResult, serverTime: new Date().toISOString() });
    return NextResponse.json({
      success: true, projectId: projectIdSafe,
      message: "🚀 AI Assistant started! Watch progress in the AI Chat...",
      research: researchResult,
      serverTime: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    debug("ROUTE_ERROR", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : "no stack" });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
