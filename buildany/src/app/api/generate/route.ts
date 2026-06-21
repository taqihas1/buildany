import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, conversations, agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateShortName } from "@/lib/project-name-generator";
import { KellyOrchestrator } from "@/lib/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId || "guest-" + crypto.randomUUID();

    const { projectId, prompt, type = "web", provider = "deepseek" } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    let projectIdSafe: string;

    if (!projectId) {
      // Create new project — just the shell, Kelly fills it in
      const newId = crypto.randomUUID();
      const shortName = generateShortName(prompt);

      await db.insert(projects).values({
        id: newId,
        userId,
        name: shortName,
        description: prompt,
        type: type as "web" | "mobile" | "dashboard",
        status: "generating",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const project = await db.select().from(projects).where(eq(projects.id, newId)).get();
      if (!project) {
        return NextResponse.json({ error: "Project creation failed" }, { status: 500 });
      }

      projectIdSafe = project.id;

      // Create decorative agents for display (Kelly does the real work)
      const agentDefs = [
        { name: 'Kelly-Brain', type: 'orchestrator' },
        { name: 'Code-Gen-001', type: 'code' },
        { name: 'Code-Gen-002', type: 'code' },
        { name: 'Tester-001', type: 'test' },
        { name: 'Reviewer-001', type: 'review' },
        { name: 'Deployer-001', type: 'deploy' },
      ];
      for (const def of agentDefs) {
        await db.insert(agents).values({
          id: crypto.randomUUID(),
          projectId: newId,
          name: def.name,
          type: def.type,
          status: 'idle',
          capabilities: JSON.stringify([]),
          createdAt: new Date(),
        });
      }
    } else {
      const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
      projectIdSafe = project.id;
    }

    // Log user prompt
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId: projectIdSafe,
      role: "user",
      content: prompt,
      model: "user",
      createdAt: new Date(),
    });

    // 🧠 KELLY TAKES OVER — she does research, wiki, code, review, preview
    const kelly = new KellyOrchestrator(
      projectIdSafe,
      prompt,
      type as 'web' | 'mobile' | 'backend',
      // Status callback
      (status) => {
        console.log("[Kelly]", status);
        db.insert(conversations).values({
          id: crypto.randomUUID(),
          projectId: projectIdSafe,
          role: 'assistant',
          content: status,
          model: 'kelly-status',
          createdAt: new Date(),
        }).catch((err: any) => console.error("[Kelly] Status log failed:", err));
      },
      // Phase callback
      (phase) => {
        console.log("[Kelly] phase:", phase);
        db.insert(conversations).values({
          id: crypto.randomUUID(),
          projectId: projectIdSafe,
          role: 'assistant',
          content: `Phase: ${phase}`,
          model: 'kelly-phase',
          createdAt: new Date(),
        }).catch((err: any) => console.error("[Kelly] Phase log failed:", err));
      },
      // Awaiting user callback
      (context) => {
        console.log("[Kelly] awaiting user:", context);
        db.insert(conversations).values({
          id: crypto.randomUUID(),
          projectId: projectIdSafe,
          role: 'assistant',
          content: `Awaiting user input: ${JSON.stringify(context)}`,
          model: 'kelly-awaiting',
          createdAt: new Date(),
        }).catch((err: any) => console.error("[Kelly] Awaiting log failed:", err));
      },
      { learningEnabled: true, autoRetryOnFailure: true }, // Enable learning!
      undefined, // Kelly will do her own research
    );

    // Fire and forget — Kelly runs the full pipeline
    kelly.start().catch((err: any) => console.error("[Kelly] Start error:", err));

    return NextResponse.json({
      success: true,
      projectId: projectIdSafe,
      message: "🚀 Kelly is on it! Watch progress in the AI Chat...",
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error: any) {
    console.error("[Generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
