import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

const PROJECTS_DIR = "/data/projects";

// Git operations for a project
export async function POST(req: NextRequest) {
  try {
    const { projectId, action, message } = await req.json();
    if (!projectId || !action) {
      return NextResponse.json({ error: "projectId and action required" }, { status: 400 });
    }

    const projectDir = path.join(PROJECTS_DIR, projectId);

    switch (action) {
      case "commit": {
        execSync("git add .", { cwd: projectDir, stdio: "ignore" });
        const commitMsg = message || `Checkpoint: ${new Date().toISOString()}`;
        execSync(`git commit -m "${commitMsg}"`, { cwd: projectDir, stdio: "ignore" });
        return NextResponse.json({ success: true, message: "Committed" });
      }

      case "log": {
        const log = execSync("git log --oneline -10", { cwd: projectDir, encoding: "utf-8", stdio: "pipe" });
        const commits = log.trim().split("\n").map(line => {
          const [hash, ...msgParts] = line.split(" ");
          return { hash, message: msgParts.join(" ") };
        });
        return NextResponse.json({ commits });
      }

      case "revert": {
        if (!message) {
          return NextResponse.json({ error: "message (commit hash) required for revert" }, { status: 400 });
        }
        execSync(`git checkout ${message} -- .`, { cwd: projectDir, stdio: "ignore" });
        return NextResponse.json({ success: true, message: `Reverted to ${message}` });
      }

      case "status": {
        const status = execSync("git status --short", { cwd: projectDir, encoding: "utf-8", stdio: "pipe" });
        return NextResponse.json({ status: status.trim() || "clean" });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[Git] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
