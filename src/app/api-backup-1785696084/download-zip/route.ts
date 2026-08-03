import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PROJECTS_DIR = "/data/projects";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);
    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const zipPath = `/tmp/${projectId}.zip`;
    
    // Create zip excluding node_modules and .next
    execSync(`cd "${projectDir}" && zip -r "${zipPath}" . -x "node_modules/*" ".next/*" "*.zip"`, {
      maxBuffer: 50 * 1024 * 1024,
    });

    const fileBuffer = fs.readFileSync(zipPath);
    
    // Clean up
    try { fs.unlinkSync(zipPath); } catch {}

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${projectId}-code.zip"`,
      },
    });
  } catch (error: any) {
    console.error("[DownloadZip] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
