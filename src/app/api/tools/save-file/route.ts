import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";

/**
 * Tool: save_file
 * Saves a code file to a project directory
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, filePath, content } = await req.json();
    
    if (!projectId || !filePath || content === undefined) {
      return NextResponse.json({ 
        error: "projectId, filePath, and content are required" 
      }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);
    const safePath = path.join(projectDir, filePath.replace(/^\//, ""));

    // Ensure the path is within the project directory (security)
    const resolvedPath = path.resolve(safePath);
    const resolvedProjectDir = path.resolve(projectDir);
    if (!resolvedPath.startsWith(resolvedProjectDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Create directory if needed
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    
    // Write file
    await fs.writeFile(safePath, content, "utf-8");

    console.log("[Tool: save_file] Saved:", filePath, "to project:", projectId);

    return NextResponse.json({
      success: true,
      filePath,
      message: `File ${filePath} saved successfully`,
    });

  } catch (error: any) {
    console.error("[Tool: save_file] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
