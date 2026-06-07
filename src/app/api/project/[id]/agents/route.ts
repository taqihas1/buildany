import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch all agents (they're not project-specific in the current schema, but we filter by metadata)
    const allAgents = await db.select().from(agents).all();
    
    // Filter agents that belong to this project (stored in metadata JSON)
    const projectAgents = allAgents.filter((agent: any) => {
      try {
        const metadata = agent.metadata ? JSON.parse(agent.metadata) : {};
        return metadata.projectId === id;
      } catch {
        return false;
      }
    });

    // Transform to match SwarmDashboard expected format
    const formattedAgents = projectAgents.map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      capabilities: agent.capabilities ? JSON.parse(agent.capabilities) : [],
      activeTasks: 0, // Will be populated by task count
      completedTasks: 0,
      failedTasks: 0,
    }));

    return NextResponse.json({ agents: formattedAgents });
  } catch (error) {
    console.error("Project agents error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
