import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";

// Serve built preview files for a project
// URL: /api/preview/{projectId}/{filePath?}
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    
    // First segment is projectId, rest is file path
    const projectId = pathSegments[0];
    const filePath = pathSegments.slice(1).join("/");

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const outDir = path.join(PROJECTS_DIR, projectId, "out");
    let targetPath = path.join(outDir, filePath || "index.html");

    // Security: ensure path stays within outDir
    const resolved = path.resolve(targetPath);
    const resolvedOut = path.resolve(outDir);
    if (!resolved.startsWith(resolvedOut)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    // Try file, fallback to index.html for SPA routing
    try {
      await fs.access(targetPath);
    } catch {
      targetPath = path.join(outDir, "index.html");
      try {
        await fs.access(targetPath);
      } catch {
        return NextResponse.json({ error: "Preview not built yet" }, { status: 404 });
      }
    }

    const content = await fs.readFile(targetPath);
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

    return new NextResponse(content, {
      headers: { "Content-Type": contentType },
    });

  } catch (error: any) {
    console.error("[Preview] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
