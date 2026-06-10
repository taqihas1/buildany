import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, projectFiles, conversations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateShortName } from "@/lib/project-name-generator";

// GET /api/projects - List all projects for the current user
export async function GET(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");

    let query = db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt))
      .limit(limit);

    const userProjects = await query;

    return NextResponse.json({
      success: true,
      projects: userProjects,
      count: userProjects.length,
    });
  } catch (error) {
    console.error("List projects error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, type = "web" } = body;

    // Generate short name from description if name is too long or generic
    let projectName = name?.trim();
    if (!projectName || projectName.length > 30 ||
        projectName.toLowerCase().includes('a ') ||
        projectName.toLowerCase().includes('an ') ||
        projectName.toLowerCase().includes('build a') ||
        projectName.toLowerCase().includes('create a')) {
      projectName = generateShortName(projectName || description || 'New Project');
    }

    if (!projectName?.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const projectId = crypto.randomUUID();
    
    await db.insert(projects).values({
      id: projectId,
      userId,
      name: projectName.trim(),
      description: description || "",
      type: type as "web" | "mobile" | "dashboard",
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();

    return NextResponse.json({
      success: true,
      project,
      message: "Project created successfully",
    });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id - Delete a project
export async function DELETE(req: NextRequest) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("id");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Verify project exists and belongs to user
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete related data first
    await db.delete(projectFiles).where(eq(projectFiles.projectId, projectId));
    await db.delete(conversations).where(eq(conversations.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
