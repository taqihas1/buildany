import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const HERMES_CONTAINER = "hermes-agent-cvaj-hermes-agent-1";
const HERMES_HOME = "/opt/data";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, query, skills } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const prompt = messages?.length
      ? messages.map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n") + `\n\nUser: ${query}`
      : query;

    const skillsFlag = skills?.length ? skills.map((s: string) => `-s ${s}`).join(" ") : "";

    const escapedPrompt = prompt.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
    const command = `docker exec -e HERMES_HOME=${HERMES_HOME} ${HERMES_CONTAINER} hermes chat -q "${escapedPrompt}" ${skillsFlag} -Q`;

    console.log("[Hermes Bridge] Executing:", command);
    const { stdout } = await execAsync(command, { timeout: 120000, maxBuffer: 1024 * 1024 });

    const response = extractResponse(stdout);
    return NextResponse.json({ success: true, response, raw: stdout });
  } catch (error: any) {
    console.error("[Hermes Bridge] Error:", error);
    return NextResponse.json({ error: "Hermes chat failed", message: error.message }, { status: 500 });
  }
}

function extractResponse(stdout: string): string {
  const lines = stdout.split("\n");
  let startIdx = -1, endIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("⚕ Hermes") && i + 1 < lines.length) startIdx = i + 1;
    if (lines[i].includes("Resume this session") || lines[i].includes("Session:")) {
      endIdx = i - 1;
      break;
    }
  }
  if (startIdx > 0 && endIdx > startIdx) return lines.slice(startIdx, endIdx + 1).join("\n").trim();
  return stdout.trim();
}
