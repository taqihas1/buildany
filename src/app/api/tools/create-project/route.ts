import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, projectFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { randomUUID } from "crypto";

const PROJECTS_DIR = "/data/projects";

/**
 * Tool: create_project
 * Creates a new project directory, initializes git, and returns projectId
 */
export async function POST(req: NextRequest) {
  try {
    const { name, description, userId } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const projectId = randomUUID();
    const projectDir = path.join(PROJECTS_DIR, projectId);

    // Create project directory
    await fs.mkdir(projectDir, { recursive: true });

    // Initialize git repo
    try {
      execSync("git init", { cwd: projectDir, stdio: "ignore" });
      execSync("git config user.email 'kelly@buildany.cloud'", { cwd: projectDir, stdio: "ignore" });
      execSync("git config user.name 'Kelly'", { cwd: projectDir, stdio: "ignore" });
    } catch {}

    // Insert into database
    const now = new Date();
    await db.insert(projects).values({
      id: projectId,
      name: name.slice(0, 100),
      description: description?.slice(0, 500) || null,
      status: "creating",
      userId: userId || "kelly-user",
      createdAt: now,
      updatedAt: now,
    });

    console.log("[Tool: create_project] Created:", projectId, name);

    return NextResponse.json({
      success: true,
      projectId,
      projectDir,
      message: `Project "${name}" created with ID: ${projectId}`,
    });

  } catch (error: any) {
    console.error("[Tool: create_project] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
