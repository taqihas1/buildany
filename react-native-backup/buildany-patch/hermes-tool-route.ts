// BuildAny Tools for Hermes Agent
// Hermes can call these to create projects, generate code, etc.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { KellyOrchestrator } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";

const TOOLS = {
  // Tool 1: Create a new project
  async createProject(params: { prompt: string; name?: string }) {
    const projectId = crypto.randomUUID();
    const name = params.name || params.prompt.slice(0, 50);
    
    await db.insert(projects).values({
      id: projectId,
      name,
      prompt: params.prompt,
      status: "created",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      success: true,
      projectId,
      name,
      message: `Created project "${name}" (${projectId}). Ready for next step.`,
    };
  },

  // Tool 2: Generate wiki pages for a project
  async generateWiki(params: { projectId: string }) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.projectId),
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    const kelly = new KellyOrchestrator(params.projectId);
    const wiki = await kelly.generateWikiPages(project.prompt, project.name);

    await db.update(projects)
      .set({ status: "wiki-generated", updatedAt: new Date() })
      .where(eq(projects.id, params.projectId));

    return {
      success: true,
      projectId: params.projectId,
      wikiPages: wiki.pages.map((p: { title: string }) => p.title),
      message: `Generated ${wiki.pages.length} wiki pages for "${project.name}".`,
    };
  },

  // Tool 3: Generate code for a project
  async generateCode(params: { projectId: string }) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.projectId),
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    const kelly = new KellyOrchestrator(params.projectId);
    const result = await kelly.generateCode(project.prompt, project.name);

    await db.update(projects)
      .set({ status: "code-generated", updatedAt: new Date() })
      .where(eq(projects.id, params.projectId));

    return {
      success: true,
      projectId: params.projectId,
      filesGenerated: result.files?.length || 0,
      message: `Generated code for "${project.name}". ${result.files?.length || 0} files created.`,
    };
  },

  // Tool 4: Get project status
  async getProjectStatus(params: { projectId: string }) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.projectId),
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    return {
      success: true,
      projectId: params.projectId,
      name: project.name,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  },

  // Tool 5: List all projects
  async listProjects() {
    const allProjects = await db.query.projects.findMany({
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
      limit: 20,
    });

    return {
      success: true,
      count: allProjects.length,
      projects: allProjects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        createdAt: p.createdAt,
      })),
    };
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tool, params } = body;

    if (!tool || !(tool in TOOLS)) {
      return NextResponse.json(
        { success: false, error: `Unknown tool: ${tool}. Available: ${Object.keys(TOOLS).join(", ")}` },
        { status: 400 }
      );
    }

    const result = await (TOOLS as any)[tool](params || {});
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Hermes Tool] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
