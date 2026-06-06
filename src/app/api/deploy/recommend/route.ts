import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { analyzeProjectForDeployment, getAlternativeOptions, DeploymentRecommendation } from "@/lib/deployment-orchestrator";

// GET /api/deploy/recommend?projectId=xxx - Get deployment recommendation with value proposition
export async function GET(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const recommendation = await analyzeProjectForDeployment(projectId);
    const alternatives = await getAlternativeOptions(projectId);

    return NextResponse.json({
      success: true,
      recommendation,
      alternatives,
      project: {
        id: project.id,
        name: project.name,
        type: project.type,
      }
    });
  } catch (error) {
    console.error("Deploy recommendation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
