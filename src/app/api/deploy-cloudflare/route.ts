import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PROJECTS_DIR = "/data/projects";

function getEnvVar(name: string, aliases?: string[]): string | undefined {
  if (process.env[name]) return process.env[name];
  if (aliases) {
    for (const alias of aliases) {
      if (process.env[alias]) return process.env[alias];
    }
  }
  
  try {
    const envContent = fs.readFileSync("/root/buildany/.env.local", "utf-8");
    const lines = envContent.split("\n");
    for (const line of lines) {
      const allNames = [name, ...(aliases || [])];
      for (const n of allNames) {
        if (line.startsWith(n + "=")) {
          return line.slice(n.length + 1).trim();
        }
      }
    }
  } catch {}
  
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, projectName } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const token = getEnvVar("CLOUDFLARE_API_TOKEN");
    const accountId = getEnvVar("CLOUDFLARE_ACCOUNT_ID", ["CF_ACCOUNT_ID"]);
    
    if (!token || !accountId) {
      return NextResponse.json({ 
        error: "Cloudflare credentials not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID env vars." 
      }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);
    const outDir = path.join(projectDir, "out");
    
    if (!fs.existsSync(outDir)) {
      return NextResponse.json({ error: "No out folder found. Build the project first." }, { status: 400 });
    }

    const name = projectName || `buildany-${projectId.slice(0, 8)}`;

    const envVars = {
      CLOUDFLARE_API_TOKEN: token,
      CLOUDFLARE_ACCOUNT_ID: accountId,
    };

    // Create Pages project if not exists
    try {
      execSync(`npx wrangler pages project create ${name} --production-branch=main`, {
        cwd: projectDir,
        env: { ...process.env, ...envVars },
        stdio: "pipe",
        timeout: 30000,
      });
    } catch (e: any) {
      const errStr = e.stderr ? e.stderr.toString() : "";
      if (!errStr.includes("already exists")) {
        console.log("[Deploy] Project create warning:", e.message);
      }
    }

    // Deploy
    const result = execSync(`npx wrangler pages deploy ${outDir} --project-name=${name} --branch=main`, {
      cwd: projectDir,
      env: { ...process.env, ...envVars },
      stdio: "pipe",
      timeout: 120000,
    });

    const output = result.toString();
    
    const urlMatch = output.match(/https:\/\/[^\s]+\.pages\.dev/);
    const url = urlMatch ? urlMatch[0] : `https://${name}.pages.dev`;

    return NextResponse.json({
      success: true,
      url,
      message: "Deployed successfully!",
    });

  } catch (error: any) {
    console.error("[Deploy] Error:", error);
    return NextResponse.json({ 
      error: error.message,
      stderr: error.stderr ? error.stderr.toString() : undefined,
    }, { status: 500 });
  }
}
