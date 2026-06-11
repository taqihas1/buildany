import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, conversations, agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateShortName } from "@/lib/project-name-generator";
import { llmRouter } from "@/lib/llm-router";

export async function POST(req: NextRequest) {
  try {
    let userId: string;
    try {
      const authData = await auth();
      userId = authData.userId || "guest-" + crypto.randomUUID();
    } catch (authError: any) {
      userId = "guest-" + crypto.randomUUID();
    }
    
    const { projectId, prompt, type = "web", provider = "deepseek", skipResearch = false } = await req.json();

    if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });

    let project;
    let researchResult = null;
    
    if (!projectId) {
      const newId = crypto.randomUUID();
      const shortName = generateShortName(prompt);
      
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
            } catch (parseErr) {
              researchResult = { raw: researchResponse.content };
            }
          }
        } catch (e) { console.error("Research failed:", e); }
      }
      
      await db.insert(projects).values({
        id: newId, userId, name: shortName, description: prompt,
        type: type as "web" | "mobile" | "dashboard",
        status: "generating", createdAt: new Date(), updatedAt: new Date(),
      });
      project = await db.select().from(projects).where(eq(projects.id, newId)).get();
      
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
      project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await db.insert(conversations).values({
      id: crypto.randomUUID(), projectId: project.id, role: "user",
      content: prompt, model: "user", createdAt: new Date(),
    });

    import("@/lib/orchestrator").then(({ HermesOrchestrator }) => {
      const hermes = new HermesOrchestrator(
        project.id, prompt, type as 'web' | 'mobile' | 'backend',
        (status) => console.log("[Hermes]", status),
        (phase) => console.log("[Hermes] phase:", phase),
        (context) => console.log("[Hermes] awaiting user:", context),
      );
      hermes.start().catch((err: any) => console.error("Hermes start error:", err));
    }).catch((err) => console.error("Failed to load orchestrator:", err));

    return NextResponse.json({
      success: true, projectId: project.id,
      message: "🚀 AI Assistant started! Watch progress in the AI Chat...",
      research: researchResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
