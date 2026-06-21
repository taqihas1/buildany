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
  skills?: string[];
}

function buildPrompt(messages: ChatMessage[], query: string): string {
  const history = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  return history ? `${history}\n\nUser: ${query}` : query;
}

function parseSkills(skills?: string[]): string {
  if (!skills || skills.length === 0) return "";
  return skills.map((s) => `-s ${s}`).join(" ");
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, query, skills } = body;

    if (!query?.trim()) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(messages || [], query);
    const skillsFlag = parseSkills(skills);

    // Escape the prompt for shell safety
    const escapedPrompt = prompt
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$");

    const command = `docker exec -e HERMES_HOME=${HERMES_HOME} ${HERMES_CONTAINER} hermes chat -q "${escapedPrompt}" ${skillsFlag} -Q`;

    console.log("[Hermes Bridge] Executing:", command);

    const { stdout, stderr } = await execAsync(command, {
      timeout: 120000, // 2 minute timeout
      maxBuffer: 1024 * 1024, // 1MB buffer
    });

    // Extract the actual response from Hermes output
    // Hermes output format: lots of decorative lines, then the response, then session info
    const response = extractResponse(stdout);

    console.log("[Hermes Bridge] Response:", response.substring(0, 200) + "...");

    return NextResponse.json({
      success: true,
      response,
      raw: stdout,
    });
  } catch (error: any) {
    console.error("[Hermes Bridge] Error:", error);

    return NextResponse.json(
      {
        error: "Hermes chat failed",
        message: error.message,
        stderr: error.stderr,
      },
      { status: 500 }
    );
  }
}

function extractResponse(stdout: string): string {
  const lines = stdout.split("\n");

  // Find the response section between the decorative lines
  // Hermes output format:
  // ... initializing ...
  // ─ ⚕ Hermes ──────────────────
  // [response]
  // ─────────────────────────────
  // Resume this session with:
  // ...

  let startIdx = -1;
  let endIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Find the start of response (line after "⚕ Hermes")
    if (line.includes("⚕ Hermes") && i + 1 < lines.length) {
      startIdx = i + 1;
    }

    // Find the end of response (line before "Resume this session" or "Session:")
    if (line.includes("Resume this session") || line.includes("Session:")) {
      endIdx = i - 1;
      break;
    }
  }

  if (startIdx > 0 && endIdx > startIdx) {
    return lines
      .slice(startIdx, endIdx + 1)
      .join("\n")
      .trim();
  }

  // Fallback: just return everything after initialization
  const initIdx = lines.findIndex((l) => l.includes("Initializing agent"));
  if (initIdx > 0) {
    return lines
      .slice(initIdx + 1)
      .join("\n")
      .trim();
  }

  return stdout.trim();
}
