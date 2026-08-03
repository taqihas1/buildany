import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const PROJECTS_DIR = "/data/projects";

/**
 * Tool: deploy_project
 * Deploys the built out/ folder to Cloudflare Pages
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, cloudflareProjectName } = await req.json();
    
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);
    const outDir = path.join(projectDir, "out");

    // Check build output exists
    try {
      await fs.access(path.join(outDir, "index.html"));
    } catch {
      return NextResponse.json({ 
        error: "No build output found. Run build first." 
      }, { status: 400 });
    }

    // Update status
    await db.update(projects)
      .set({ status: "deploying", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    // Deploy in background
    deployInBackground(projectId, outDir, cloudflareProjectName);

    return NextResponse.json({
      success: true,
      status: "deploying",
      message: "Deployment started for project " + projectId,
    });

  } catch (error: any) {
    console.error("[Tool: deploy_project] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function deployInBackground(
  projectId: string, 
  outDir: string, 
  cloudflareProjectName?: string
) {
  try {
    console.log("[Deploy] Starting:", projectId);

    // Check if wrangler is configured
    const projectName = cloudflareProjectName || `buildany-${projectId.slice(0, 8)}`;
    
    // Deploy using wrangler
    console.log("[Deploy] Uploading to Cloudflare Pages:", projectName);
    
    execSync(
      `npx wrangler pages deploy "${outDir}" --project-name="${projectName}" --branch=main`,
      { stdio: "pipe", timeout: 120000 }
    );

    const deployUrl = `https://${projectName}.pages.dev`;

    // Update status
    await db.update(projects)
      .set({ 
        status: "deployed", 
        deployUrl,
        updatedAt: new Date() 
      })
      .where(eq(projects.id, projectId));

    console.log("[Deploy] Complete:", deployUrl);

  } catch (error: any) {
    console.error("[Deploy] Failed:", error);
    await db.update(projects)
      .set({ status: "deploy_failed", updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }
}
