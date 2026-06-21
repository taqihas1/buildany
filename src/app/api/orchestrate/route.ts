import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { db } from "@/lib/db";
import { projects, projectFiles, conversations, tasks } from "@/lib/db/schema";
import { generateShortName } from "@/lib/project-name-generator";
import { eq } from "drizzle-orm";
import { runMorganTask, getMorganTaskList } from "@/lib/morgan-executor";

const execAsync = promisify(exec);

const HERMES_CONTAINER = "hermes-gateway";
const HERMES_HOME = "/opt/data";
const HOST_DATA_DIR = "/root/.hermes";
const OPENMANUS_DIR = "/root/OpenManus";

// Kelly's system prompt for orchestration
const KELLY_SYSTEM_PROMPT = `You are Kelly, the AI Architect and Brain of BuildAny.

Your job is to analyze user requests and decide WHO should execute them:
- **kelly** (you): Planning, research, architecture design, code review, task breakdown
- **morgan** (OpenManus): Security audits, bulk fixes, refactoring, automated testing, complex automation
- **buildany** (native): Code generation, file creation, preview rendering

RULES:
1. Always respond with VALID JSON
2. Never delegate what you can do in one step
3. Use morgan for: security audits, fixing all errors at once, large refactors, browser automation
4. Use buildany for: generating new code files, creating previews
5. Use kelly (yourself) for: planning, research, reviewing, advising

RESPONSE FORMAT:
{
  "executor": "kelly|morgan|buildany",
  "reasoning": "Why this executor was chosen",
  "plan": {
    "steps": ["Step 1", "Step 2"],
    "estimatedComplexity": "low|medium|high"
  },
  "context": {
    "skillsToUse": ["skill-name"],
    "promptForExecutor": "The actual prompt to send to the executor"
  }
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      prompt, 
      type = "web", 
      provider = "deepseek", 
      userId,
      projectId,
      action = "create" // create | review | audit | fix
    } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Step 1: Ask Kelly to decide who should execute
    console.log("[Orchestrator] Step 1: Kelly deciding executor...");
    const decision = await askKellyToDecide(prompt, action, type);
    
    if (!decision) {
      return NextResponse.json({ error: "Kelly failed to make a decision" }, { status: 500 });
    }

    console.log("[Orchestrator] Kelly decided:", decision.executor, "-", decision.reasoning);

    // Step 2: Route to the chosen executor
    let result: any;
    
    switch (decision.executor) {
      case "kelly":
        result = await executeWithKelly(decision.context.promptForExecutor, type, provider);
        break;
      case "morgan":
        result = await executeWithMorgan(decision.context.promptForExecutor, projectId);
        break;
      case "buildany":
        result = await executeWithBuildAny(decision.context.promptForExecutor, type, userId);
        break;
      default:
        // Default to Kelly
        result = await executeWithKelly(decision.context.promptForExecutor, type, provider);
    }

    // Step 3: Store the task record
    if (projectId) {
      await db.insert(tasks).values({
        id: crypto.randomUUID(),
        projectId,
        title: decision.plan.steps[0] || prompt.slice(0, 50),
        description: decision.reasoning,
        status: "completed",
        assignee: decision.executor,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      executor: decision.executor,
      reasoning: decision.reasoning,
      plan: decision.plan,
      result,
      message: `✅ ${decision.executor === "kelly" ? "Kelly" : decision.executor === "morgan" ? "Morgan" : "BuildAny"} completed the task`,
    });

  } catch (error: any) {
    console.error("[Orchestrator] Error:", error);
    return NextResponse.json(
      { error: "Orchestration failed", message: error.message },
      { status: 500 }
    );
  }
}

// Ask Kelly to decide which executor to use
async function askKellyToDecide(prompt: string, action: string, type: string): Promise<any> {
  const tmpFileName = `orchestrate_decide_${Date.now()}.txt`;
  const hostFilePath = `${HOST_DATA_DIR}/${tmpFileName}`;
  const containerFilePath = `${HERMES_HOME}/${tmpFileName}`;

  const decisionPrompt = `${KELLY_SYSTEM_PROMPT}

USER REQUEST: ${prompt}
ACTION TYPE: ${action}
PROJECT TYPE: ${type}

Analyze this request and decide the best executor. Respond ONLY with JSON.`;

  writeFileSync(hostFilePath, decisionPrompt, "utf-8");

  try {
    const command = `docker exec -e HERMES_HOME=${HERMES_HOME} ${HERMES_CONTAINER} hermes chat -f "${containerFilePath}" -Q`;
    const { stdout } = await execAsync(command, {
      timeout: 60000,
      maxBuffer: 1024 * 1024,
    });

    return parseDecisionResponse(stdout);
  } finally {
    try { unlinkSync(hostFilePath); } catch {}
  }
}

// Execute with Kelly (planning, research, review)
async function executeWithKelly(prompt: string, type: string, provider: string) {
  console.log("[Orchestrator] Executing with Kelly...");
  
  // Use Kelly's skills for better results
  const tmpFileName = `kelly_execute_${Date.now()}.txt`;
  const hostFilePath = `${HOST_DATA_DIR}/${tmpFileName}`;
  const containerFilePath = `${HERMES_HOME}/${tmpFileName}`;

  const executionPrompt = `You are Kelly, the AI Architect. 
Use your planning-and-task-breakdown skill to analyze and respond.

REQUEST: ${prompt}
PROJECT TYPE: ${type}

Provide a structured response with actionable insights.`;

  writeFileSync(hostFilePath, executionPrompt, "utf-8");

  try {
    const command = `docker exec -e HERMES_HOME=${HERMES_HOME} ${HERMES_CONTAINER} hermes chat -f "${containerFilePath}" -Q`;
    const { stdout } = await execAsync(command, {
      timeout: 120000,
      maxBuffer: 2 * 1024 * 1024,
    });

    return {
      output: stdout,
      type: "kelly_response",
    };
  } finally {
    try { unlinkSync(hostFilePath); } catch {}
  }
}

// Execute with Morgan (lightweight executor - no OpenManus install needed)
async function executeWithMorgan(prompt: string, projectId?: string) {
  console.log("[Orchestrator] Executing with Morgan (lightweight)...");
  
  // Determine which task to run based on prompt
  const taskName = prompt.toLowerCase().includes("security") ? "security-audit" :
                   prompt.toLowerCase().includes("clean") ? "code-cleanup" :
                   prompt.toLowerCase().includes("depend") ? "dependency-audit" :
                   prompt.toLowerCase().includes("test") ? "test-generation" :
                   "security-audit"; // Default

  const result = await runMorganTask(taskName, projectId);

  return {
    output: result.output,
    type: result.success ? "morgan_response" : "morgan_error",
    taskId: result.taskId,
  };
}

// Execute with BuildAny native (code generation)
async function executeWithBuildAny(prompt: string, type: string, userId?: string) {
  console.log("[Orchestrator] Executing with BuildAny native...");
  
  // Use the existing hermes-orchestrate logic for code generation
  const newId = crypto.randomUUID();
  const shortName = generateShortName(prompt);

  await db.insert(projects).values({
    id: newId,
    userId: userId || "guest-" + crypto.randomUUID(),
    name: shortName,
    description: prompt,
    type: type as "web" | "mobile" | "dashboard",
    status: "ready",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(conversations).values({
    id: crypto.randomUUID(),
    projectId: newId,
    role: "user",
    content: prompt,
    model: "user",
    createdAt: new Date(),
  });

  return {
    projectId: newId,
    projectName: shortName,
    type: "buildany_response",
  };
}

function parseDecisionResponse(stdout: string): any {
  try {
    let content = stdout;

    // Try to find JSON between code blocks
    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      content = codeBlockMatch[1];
    } else {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
    }

    content = content.trim();
    const parsed = JSON.parse(content);

    // Validate required fields
    if (!parsed.executor || !["kelly", "morgan", "buildany"].includes(parsed.executor)) {
      parsed.executor = "kelly"; // Default to Kelly
    }

    if (!parsed.context) {
      parsed.context = { promptForExecutor: stdout };
    }

    if (!parsed.plan) {
      parsed.plan = { steps: ["Execute task"], estimatedComplexity: "medium" };
    }

    return parsed;
  } catch (err) {
    console.error("[Orchestrator] Decision parse error:", err);
    // Fallback: Assume Kelly
    return {
      executor: "kelly",
      reasoning: "Failed to parse decision, defaulting to Kelly",
      plan: { steps: ["Analyze request"], estimatedComplexity: "medium" },
      context: { promptForExecutor: stdout, skillsToUse: [] },
    };
  }
}
