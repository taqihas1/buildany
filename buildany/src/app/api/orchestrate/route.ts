import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import {
  buildSkillRegistry,
  buildARD,
  buildOKF,
  loadKnowledge,
  saveKnowledge,
  extractLearnings,
} from "@/lib/ard-okf-skills";
import { generateWithMorgan, isMorganAvailable } from "@/lib/morgan-generator";

const execAsync = promisify(exec);

// Hermes container config
const HERMES_CONTAINER = "hermes-gateway";
const HERMES_HOME = "/opt/data";
const HOST_DATA_DIR = "/root/.hermes";
const OPENMANUS_DIR = "/root/OpenManus";
const OPENMANUS_VENV = `${OPENMANUS_DIR}/.venv/bin/python3`;

// Ponytail rules (minimalist coding)
const PONYTAIL_RULES = `
PONYTAIL RULES (Lazy Senior Dev Philosophy):
1. Does this need to exist? → If no, skip it (YAGNI)
2. Does stdlib do it? → Use stdlib
3. Native platform feature? → Use it
4. Installed dependency? → Use it
5. One line possible? → One line
6. Only then: the minimum that works

SAFETY GUARANTEE: Never cut corners on validation, error handling, security, accessibility, or data integrity.
`;

// Kelly's system prompt for deciding executor
const KELLY_SYSTEM_PROMPT = `
You are Kelly, the AI Architect for BuildAny.

Your role: Analyze the user's request and decide who should execute.

EXECUTORS:
- "kelly" → You handle: planning, research, architecture, task breakdown, high-level design
- "morgan" → Morgan handles: code generation, security audits, bulk fixes, refactoring, testing, file operations
- "buildany" → BuildAny native: fast template-based generation (only for very simple tasks)

RULE: For ANY code generation, file creation, or project building → ALWAYS choose "morgan"
RULE: For planning, research, or design → choose "kelly"

Return ONLY valid JSON:
{
  "executor": "kelly|morgan|buildany",
  "reasoning": "why this executor",
  "plan": ["step 1", "step 2", "step 3"],
  "context": { "additional": "data" }
}
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type, provider, userId, projectId, action } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Step 1: Ask Kelly who should execute
    console.log("[Orchestrate] Kelly deciding executor for:", prompt.substring(0, 50));
    
    const kellyDecision = await callKellyForDecision(prompt, type);
    console.log("[Orchestrate] Kelly chose:", kellyDecision.executor);

    // Step 2: Route to chosen executor
    switch (kellyDecision.executor) {
      case "kelly":
        return await handleKellyExecution(prompt, kellyDecision);
      
      case "morgan":
        return await handleMorganExecution(prompt, kellyDecision, projectId);
      
      case "buildany":
        return await handleBuildAnyExecution(prompt, kellyDecision);
      
      default:
        // Default to Morgan for unknown executors
        return await handleMorganExecution(prompt, kellyDecision, projectId);
    }
  } catch (error: any) {
    console.error("[Orchestrate] Error:", error);
    return NextResponse.json(
      { error: "Orchestration failed", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Call Kelly (Hermes) to decide executor
 */
async function callKellyForDecision(prompt: string, type?: string): Promise<{
  executor: string;
  reasoning: string;
  plan: string[];
  context: Record<string, any>;
}> {
  const decisionPrompt = `
${KELLY_SYSTEM_PROMPT}

USER REQUEST: ${prompt}
${type ? `REQUEST TYPE: ${type}` : ""}

Decide who should execute this request. Return JSON only.
`;

  try {
    // Call Hermes gateway
    const response = await fetch("http://127.0.0.1:8642/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.HERMES_API_KEY || ""}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: KELLY_SYSTEM_PROMPT },
          { role: "user", content: decisionPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      // Fallback: default to morgan for code generation
      return {
        executor: "morgan",
        reasoning: "Hermes unavailable, defaulting to Morgan for code generation",
        plan: ["Generate code", "Self-review", "Fix issues"],
        context: {},
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from Kelly's response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decision = JSON.parse(jsonMatch[0]);
        return {
          executor: decision.executor || "morgan",
          reasoning: decision.reasoning || "",
          plan: decision.plan || [],
          context: decision.context || {},
        };
      }
    } catch (e) {
      console.log("[Orchestrate] Could not parse Kelly decision, defaulting to Morgan");
    }

    // Default to Morgan
    return {
      executor: "morgan",
      reasoning: "Defaulting to Morgan for code generation",
      plan: ["Analyze request", "Generate code", "Self-review"],
      context: {},
    };
  } catch (error) {
    console.error("[Orchestrate] Kelly decision failed:", error);
    return {
      executor: "morgan",
      reasoning: "Error calling Kelly, defaulting to Morgan",
      plan: ["Generate code with Morgan"],
      context: {},
    };
  }
}

/**
 * Handle Kelly execution (planning, research)
 */
async function handleKellyExecution(
  prompt: string,
  decision: any
): Promise<NextResponse> {
  // Forward to Hermes chat
  const response = await fetch("http://127.0.0.1:8642/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.HERMES_API_KEY || ""}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are Kelly, the AI Architect." },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "";

  return NextResponse.json({
    executor: "kelly",
    reply,
    plan: decision.plan,
    type: "planning",
  });
}

/**
 * Handle Morgan execution (code generation, audit, etc.)
 */
async function handleMorganExecution(
  prompt: string,
  decision: any,
  projectId?: string
): Promise<NextResponse> {
  console.log("[Orchestrate] Delegating to Morgan...");

  // Check Morgan availability
  const morganAvailable = await isMorganAvailable();
  if (!morganAvailable) {
    return NextResponse.json(
      { error: "Morgan (OpenManus) is not available" },
      { status: 503 }
    );
  }

  // Build project path
  const projectPath = projectId 
    ? `/root/buildany/projects/${projectId}`
    : `/root/buildany/projects/default`;

  // Load existing knowledge
  const { ard: existingARD, okf: existingOKF } = await loadKnowledge(projectPath);

  // Build skill registry
  const skillRegistry = await buildSkillRegistry();

  // Build fresh ARD with all skills
  const ard = buildARD(projectId || "default", skillRegistry);

  // Build OKF with learnings
  const learnings = extractLearnings(
    decision.context?.type || "unknown",
    [],
    ["Morgan code generation"]
  );
  const okf = buildOKF(projectId || "default", learnings, existingOKF);

  // Save knowledge
  await saveKnowledge(projectPath, ard, okf);

  // Call Morgan to generate
  const result = await generateWithMorgan({
    plan: decision.plan,
    ard,
    okf,
    ponytail: PONYTAIL_RULES,
    projectPath,
    userPrompt: prompt,
    skills: [
      ...skillRegistry.hermesSkills,
      ...skillRegistry.superpowerSkills,
      ...skillRegistry.ponytailSkills,
    ],
  });

  if (result.success) {
    // Update OKF with results
    const newLearnings = extractLearnings(
      "code_generation",
      result.errors ? [result.errors] : [],
      [`Generated ${result.files.length} files`]
    );
    const updatedOKF = buildOKF(projectId || "default", newLearnings, okf);
    await saveKnowledge(projectPath, ard, updatedOKF);

    return NextResponse.json({
      executor: "morgan",
      success: true,
      files: result.files,
      review: result.review,
      plan: decision.plan,
      type: "code_generation",
    });
  } else {
    return NextResponse.json({
      executor: "morgan",
      success: false,
      error: result.errors,
      plan: decision.plan,
      type: "code_generation",
    }, { status: 500 });
  }
}

/**
 * Handle BuildAny native execution (fallback for simple tasks)
 */
async function handleBuildAnyExecution(
  prompt: string,
  decision: any
): Promise<NextResponse> {
  // Forward to native generate API
  const response = await fetch("http://127.0.0.1:3000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, plan: decision.plan }),
  });

  const data = await response.json();
  return NextResponse.json({
    executor: "buildany",
    ...data,
    plan: decision.plan,
    type: "native_generation",
  });
}
