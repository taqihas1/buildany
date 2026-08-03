import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    const projectId = pathSegments[0];
    const filePath = pathSegments.slice(1).join("/");

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const outDir = path.join(PROJECTS_DIR, projectId, "out");
    const projectRoot = path.join(PROJECTS_DIR, projectId);
    
    // Try out/ dir first (built projects), then project root (raw files)
    let targetPath = path.join(outDir, filePath || "index.html");
    let activeDir = outDir;

    try {
      await fs.access(targetPath);
    } catch {
      // Fallback to project root
      targetPath = path.join(projectRoot, filePath || "index.html");
      activeDir = projectRoot;
      try {
        await fs.access(targetPath);
      } catch {
        // Fallback to index.html in project root
        targetPath = path.join(projectRoot, "index.html");
        try {
          await fs.access(targetPath);
        } catch {
          return NextResponse.json({ error: "Preview not built yet" }, { status: 404 });
        }
      }
    }

    // Security: ensure path stays within activeDir
    const resolved = path.resolve(targetPath);
    const resolvedDir = path.resolve(activeDir);
    if (!resolved.startsWith(resolvedDir)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    const fileContent = await fs.readFile(targetPath);
    const ext = path.extname(targetPath);
    const contentType =
      ext === ".html" ? "text/html" :
      ext === ".js" ? "application/javascript" :
      ext === ".css" ? "text/css" :
      ext === ".json" ? "application/json" :
      ext === ".svg" ? "image/svg+xml" :
      ext === ".png" ? "image/png" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      "application/octet-stream";

    return new NextResponse(fileContent, {
      headers: { "Content-Type": contentType },
    });

  } catch (error: any) {
    console.error("[Preview] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
