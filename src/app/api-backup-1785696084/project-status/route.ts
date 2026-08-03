import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: project.id,
      status: project.status,
      name: project.name,
      updatedAt: project.updatedAt,
    });

  } catch (error: any) {
    console.error("[Status] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
