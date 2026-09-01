import { NextRequest, NextResponse } from "next/server";
import { startHarnessSession, getSessionStatus, listHarnessSessions, killHarnessSession } from "@/lib/harness-orchestrator";
import { db } from "@/lib/db";
import { projects, projectFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateShortName } from "@/lib/project-name-generator";
import { startBuildWatcher } from "@/lib/build-watcher";

/**
 * POST /api/harness/build
 * Start a new Harness session to build a project
 * 
 * Body: { prompt: string, type?: "web" | "mobile" | "backend" }
 * Returns: { success: true, sessionId: string, projectId: string, status: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type = "web", projectId: existingProjectId } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Create project if needed
    let projectId = existingProjectId;
    if (!projectId) {
      const shortName = generateShortName(prompt);
      const newProject = await db.insert(projects).values({
        id: crypto.randomUUID(),
        name: shortName,
        description: prompt,
        platform: type,
        status: 'generating',
        userId: 'harness-system', // Harness doesn't require auth
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      projectId = newProject[0].id;
    }

    // Start Harness session
    const session = await startHarnessSession(projectId, prompt, type);

    // Start file watcher to monitor build progress
    const projectDir = "/data/projects/" + projectId;
    startBuildWatcher(projectId, projectDir);

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      projectId,
      status: session.status,
      message: "Harness session started",
    });

  } catch (error: any) {
    console.error("[Harness API] Error starting session:", error);
    return NextResponse.json(
      { error: "Failed to start Harness session", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/harness/build?sessionId=xxx
 * Get status of a Harness session
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const projectId = searchParams.get("projectId");

    if (!sessionId && !projectId) {
      return NextResponse.json({ error: "sessionId or projectId required" }, { status: 400 });
    }

    // If projectId provided, get latest session for that project
    if (projectId && !sessionId) {
      const sessions = listHarnessSessions().filter(s => s.projectId === projectId);
      if (sessions.length === 0) {
        return NextResponse.json({ error: "No active sessions for this project" }, { status: 404 });
      }
      const session = await getSessionStatus(sessions[sessions.length - 1].sessionId);
      return NextResponse.json({ success: true, session });
    }

    const session = await getSessionStatus(sessionId!);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, session });

  } catch (error: any) {
    console.error("[Harness API] Error getting status:", error);
    return NextResponse.json(
      { error: "Failed to get session status", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/harness/build?sessionId=xxx
 * Kill a running Harness session
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const killed = await killHarnessSession(sessionId);
    return NextResponse.json({ success: killed });

  } catch (error: any) {
    console.error("[Harness API] Error killing session:", error);
    return NextResponse.json(
      { error: "Failed to kill session", message: error.message },
      { status: 500 }
    );
  }
}
