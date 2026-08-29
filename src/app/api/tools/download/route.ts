import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const PROJECTS_DIR = "/data/projects";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);
    
    try {
      await fs.access(projectDir);
    } catch {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create ZIP using system zip command
    const zipPath = `/tmp/${projectId}.zip`;
    const { stdout, stderr } = await execAsync(
      `cd ${PROJECTS_DIR} && zip -r ${zipPath} ${projectId} -x "*/node_modules/*" -x "*/.git/*" -x "*/.next/*" -x "*/out/*"`,
      { timeout: 60000 }
    );

    if (stderr && !stderr.includes("warning")) {
      console.log("[Download] zip stderr:", stderr);
    }

    const zipBuffer = await fs.readFile(zipPath);
    await fs.unlink(zipPath).catch(() => {});
    
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${projectId}.zip"`,
      },
    });

  } catch (error: any) {
    console.error("[Download] Error:", error);
    return NextResponse.json({ error: error.message || "Download failed" }, { status: 500 });
  }
}
