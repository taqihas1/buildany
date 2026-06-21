import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const HERMES_CONTAINER = "hermes-agent-cvaj-hermes-agent-1";
const HERMES_HOME = "/opt/data";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  query: string;
}

function buildPrompt(messages: ChatMessage[], query: string): string {
  const history = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");
  return history ? `${history}\n\nUser: ${query}` : query;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, query } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const prompt = buildPrompt(messages || [], query);

    // Safer escaping: use a temporary file instead of inline shell escaping
    const fs = await import("fs");
    const os = await import("os");
    const tmpFile = `${os.tmpdir()}/hermes_prompt_${Date.now()}.txt`;
    fs.writeFileSync(tmpFile, prompt, "utf-8");

    const command = `docker exec -e HERMES_HOME=${HERMES_HOME} ${HERMES_CONTAINER} hermes chat -f "${tmpFile}" -Q`;

    console.log("[Hermes Bridge] Executing:", command);

    const { stdout, stderr } = await execAsync(command, {
      timeout: 120000,
      maxBuffer: 1024 * 1024,
    });

    // Clean up temp file
    try { fs.unlinkSync(tmpFile); } catch {}

    // Check stderr for errors
    if (stderr && stderr.includes("Error")) {
      console.error("[Hermes Bridge] stderr:", stderr);
    }

    const response = extractResponse(stdout);

    console.log("[Hermes Bridge] Response:", response.substring(0, 200) + "...");

    return NextResponse.json({ success: true, response, raw: stdout });
  } catch (error: any) {
    console.error("[Hermes Bridge] Error:", error);
    return NextResponse.json(
      { error: "Hermes chat failed", message: error.message, stderr: error.stderr },
      { status: 500 }
    );
  }
}

function extractResponse(stdout: string): string {
  const lines = stdout.split("\n");

  // Find response between Hermes header and Session footer
  let startIdx = -1;
  let endIdx = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes("⚕ Hermes") || line.includes("Hermes ─")) {
      startIdx = i + 1;
    }
    if (line.includes("Resume this session") || line.includes("Session:") || line.includes("Cost:")) {
      endIdx = i;
      break;
    }
  }

  if (startIdx > 0 && endIdx > startIdx) {
    const result = lines.slice(startIdx, endIdx).join("\n").trim();
    if (result.length > 0) return result;
  }

  // Fallback: everything after "Initializing agent"
  const initIdx = lines.findIndex((l) => l.includes("Initializing agent"));
  if (initIdx >= 0) {
    const result = lines.slice(initIdx + 1).join("\n").trim();
    if (result.length > 0) return result;
  }

  // Ultimate fallback: return everything but filter out obvious CLI noise
  return lines
    .filter((l) => !l.includes("docker") && !l.includes("exec") && !l.includes("$"))
    .join("\n")
    .trim();
}
