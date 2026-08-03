import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, projectFiles, conversations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { rmSync } from "fs";
import { join } from "path";

const PROJECTS_DIR = "/data/projects";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const allProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      projects: allProjects,
    });
  } catch (error: any) {
    console.error("[Projects] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Project ID is required" }, { status: 400 });
    }

    // Delete from database
    await db.delete(conversations).where(eq(conversations.projectId, id));
    await db.delete(projectFiles).where(eq(projectFiles.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));

    // Delete from filesystem
    try {
      const projectDir = join(PROJECTS_DIR, id);
      rmSync(projectDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist, that's ok
    }

    return NextResponse.json({ success: true, message: "Project deleted" });
  } catch (error: any) {
    console.error("[Delete Project] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete project" },
      { status: 500 }
    );
  }
}