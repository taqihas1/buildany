import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    // Allow guest access — project-scoped data

    const { id } = await params;

    // Fetch all agents (they're not project-specific in the current schema, but we filter by metadata)
    const allAgents = await db.select().from(agents).all();
    
    // Filter agents that belong to this project (direct projectId OR metadata)
    const projectAgents = allAgents.filter((agent: any) => {
      // Check direct projectId column first
      if (agent.projectId === id) return true;
      // Fallback to metadata
      try {
        const metadata = agent.metadata ? JSON.parse(agent.metadata) : {};
        return metadata.projectId === id;
      } catch {
        return false;
      }
    });

    // Transform to match SwarmDashboard expected format
    // Fetch task counts for each agent
    const allTasks = await db.select().from(tasks).where(eq(tasks.projectId, id));
    
    const formattedAgents = projectAgents.map((agent: any) => {
      const agentTasks = allTasks.filter((t: any) => t.agentId === agent.id);
      return {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        capabilities: agent.capabilities ? JSON.parse(agent.capabilities) : [],
        activeTasks: agentTasks.filter((t: any) => !['completed','done','success','failed','error'].includes(t.status)).length,
        completedTasks: agentTasks.filter((t: any) => ['completed','done','success'].includes(t.status)).length,
        failedTasks: agentTasks.filter((t: any) => ['failed','error'].includes(t.status)).length,
      };
    });

    return NextResponse.json({ agents: formattedAgents });
  } catch (error) {
    console.error("Project agents error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
