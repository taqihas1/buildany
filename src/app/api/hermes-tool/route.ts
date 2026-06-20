import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { KellyOrchestrator } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";

const TOOLS = {
  async createProject(params: { prompt: string; name?: string }) {
    const projectId = crypto.randomUUID();
    const name = params.name || params.prompt.slice(0, 50);
    await db.insert(projects).values({
      id: projectId, userId: "hermes-agent", name,
      description: params.prompt, type: "web", status: "draft",
    });
    return { success: true, projectId, name,
      message: `Created project "${name}" (${projectId}).` };
  },
  async generateWiki(params: { projectId: string }) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.projectId) });
    if (!project) return { success: false, error: "Project not found" };
    const kelly = new KellyOrchestrator(params.projectId, project.description || "", "web", (s) => {}, (p) => {}, (c) => {});
    await kelly.start();
    return { success: true, projectId: params.projectId,
      message: "Project orchestration started (wiki + code generation)." };
  },
  async generateCode(params: { projectId: string }) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.projectId) });
    if (!project) return { success: false, error: "Project not found" };
    const kelly = new KellyOrchestrator(params.projectId, project.description || "", "web", (s) => {}, (p) => {}, (c) => {});
    await kelly.start();
    return { success: true, projectId: params.projectId,
      message: "Full project generation started (wiki + code + review)." };
  },
  async getProjectStatus(params: { projectId: string }) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.projectId) });
    if (!project) return { success: false, error: "Project not found" };
    return { success: true, projectId: params.projectId, name: project.name,
      status: project.status, createdAt: project.createdAt, updatedAt: project.updatedAt };
  },
  async listProjects() {
    const all = await db.query.projects.findMany({
      orderBy: (p, { desc }) => [desc(p.createdAt)], limit: 20 });
    return { success: true, count: all.length,
      projects: all.map(p => ({ id: p.id, name: p.name, status: p.status, createdAt: p.createdAt })) };
  },
};

export async function POST(req: NextRequest) {
  try {
    const { tool, params } = await req.json();
    if (!tool || !(tool in TOOLS)) {
      return NextResponse.json({ success: false,
        error: `Unknown tool: ${tool}. Available: ${Object.keys(TOOLS).join(", ")}` }, { status: 400 });
    }
    const result = await (TOOLS as any)[tool](params || {});
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
