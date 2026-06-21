import { NextRequest, NextResponse } from "next/server";
import { generateKellySystemPrompt, exportTrainingForHermes } from "@/lib/kelly-training";
import { initializeMorgan, checkOpenManus, getMorganTasks } from "@/lib/morgan-training";
import { writeFileSync, mkdirSync, existsSync } from "fs";

const HERMES_SKILLS_DIR = "/root/.hermes/skills";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent = "both", action = "train" } = body;

    const results: any = {};

    // === TRAIN KELLY ===
    if (agent === "kelly" || agent === "both") {
      console.log("[Training] Initializing Kelly...");

      // 1. Generate system prompt with user preferences
      const systemPrompt = await generateKellySystemPrompt();
      
      // 2. Save to Hermes skills directory
      if (existsSync(HERMES_SKILLS_DIR)) {
        const kellySkillDir = `${HERMES_SKILLS_DIR}/buildany-kelly`;
        if (!existsSync(kellySkillDir)) {
          mkdirSync(kellySkillDir, { recursive: true });
        }

        const skillContent = `---
name: buildany-kelly
description: "BuildAny AI Architect - learned user preferences and project patterns"
---

${systemPrompt}
`;
        writeFileSync(`${kellySkillDir}/SKILL.md`, skillContent, "utf-8");

        // 3. Export training data
        const trainingData = await exportTrainingForHermes();
        writeFileSync(`${kellySkillDir}/training.md`, trainingData, "utf-8");

        results.kelly = {
          success: true,
          skillPath: kellySkillDir,
          systemPromptLength: systemPrompt.length,
          message: "Kelly trained with user preferences and project history",
        };
      } else {
        results.kelly = {
          success: false,
          error: `Hermes skills directory not found: ${HERMES_SKILLS_DIR}`,
        };
      }
    }

    // === TRAIN MORGAN ===
    if (agent === "morgan" || agent === "both") {
      console.log("[Training] Initializing Morgan...");

      const initResult = await initializeMorgan();
      const status = await checkOpenManus();
      const tasks = getMorganTasks();

      results.morgan = {
        success: initResult.success,
        installed: status.installed,
        configExists: status.configExists,
        tasksAvailable: status.tasksAvailable,
        taskTemplates: tasks.map(t => ({ name: t.name, description: t.description })),
        message: initResult.message,
      };
    }

    return NextResponse.json({
      success: true,
      trained: agent,
      results,
      message: `Training complete for ${agent === "both" ? "Kelly + Morgan" : agent}`,
    });

  } catch (error: any) {
    console.error("[Training] Error:", error);
    return NextResponse.json(
      { error: "Training failed", message: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return current training status
  try {
    const kellySkillExists = existsSync(`${HERMES_SKILLS_DIR}/buildany-kelly`);
    const morganStatus = await checkOpenManus();

    return NextResponse.json({
      kelly: {
        trained: kellySkillExists,
        skillPath: kellySkillExists ? `${HERMES_SKILLS_DIR}/buildany-kelly` : null,
      },
      morgan: {
        installed: morganStatus.installed,
        configExists: morganStatus.configExists,
        tasks: morganStatus.tasksAvailable,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Status check failed", message: error.message },
      { status: 500 }
    );
  }
}
