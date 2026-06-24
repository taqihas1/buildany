import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, conversations } from "@/lib/db/schema";
import { generateShortName } from "@/lib/project-name-generator";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";

// POST /api/project-chat-init
// Creates a project for chat-first flow — NO generation yet
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type = "web", userId } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const projectId = crypto.randomUUID();
    const shortName = generateShortName(prompt);

    // 1. Create project record (status: draft — not generating yet)
    await db.insert(projects).values({
      id: projectId,
      userId: userId || "guest-" + crypto.randomUUID(),
      name: shortName,
      description: prompt,
      type: type as "web" | "mobile" | "dashboard",
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Create filesystem directory
    const projectDir = path.join(PROJECTS_DIR, projectId);
    await fs.mkdir(projectDir, { recursive: true });

    // 3. Log user prompt as conversation
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId,
      role: "user",
      content: prompt,
      model: "user",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      projectId,
      projectName: shortName,
      status: "draft",
      message: `Project "${shortName}" created! Chat with Morgan to refine your app.`,
    });

  } catch (error: any) {
    console.error("[Project Init] Error:", error);
    return NextResponse.json(
      { error: "Failed to create project", message: error.message },
      { status: 500 }
    );
  }
}
