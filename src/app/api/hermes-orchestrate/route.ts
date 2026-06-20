import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync } from "fs";
import { buildHermesPrompt, HERMES_CONTAINER, HERMES_HOME, HOST_DATA_DIR } from "@/lib/hermes-orchestrator";
import { db } from "@/lib/db";
import { projects, projectFiles, conversations, wikiPages } from "@/lib/db/schema";
import { generateShortName } from "@/lib/project-name-generator";
import { eq } from "drizzle-orm";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type = "web", provider = "deepseek", userId } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 1. Build Kelly prompt with skills
    const hermesPrompt = buildHermesPrompt(prompt, type);
    const tmpFileName = `hermes_orchestrate_${Date.now()}.txt`;
    const hostFilePath = `${HOST_DATA_DIR}/${tmpFileName}`;
    const containerFilePath = `${HERMES_HOME}/${tmpFileName}`;

    writeFileSync(hostFilePath, hermesPrompt, "utf-8");

    // 2. Call Kelly
    const command = `docker exec -e HERMES_HOME=${HERMES_HOME} ${HERMES_CONTAINER} hermes chat -f "${containerFilePath}" -Q`;
    console.log("[Kelly Orchestrate] Executing...");

    const { stdout, stderr } = await execAsync(command, {
      timeout: 180000, // 3 minutes for orchestration
      maxBuffer: 2 * 1024 * 1024, // 2MB buffer
    });

    try { unlinkSync(hostFilePath); } catch {}

    if (stderr && stderr.includes("Error")) {
      console.error("[Kelly Orchestrate] stderr:", stderr);
    }

    // 3. Parse JSON response
    const result = parseHermesResponse(stdout);

    if (!result || !result.projectName) {
      console.error("[Kelly Orchestrate] Failed to parse response");
      console.log("[Kelly Orchestrate] Raw stdout:", stdout.substring(0, 500));
      return NextResponse.json(
        { error: "Kelly failed to generate a valid plan", raw: stdout.substring(0, 1000) },
        { status: 500 }
      );
    }

    // 4. Create project in DB
    const newId = crypto.randomUUID();
    const shortName = result.projectName || generateShortName(prompt);

    await db.insert(projects).values({
      id: newId,
      userId: userId || "guest-" + crypto.randomUUID(),
      name: shortName,
      description: result.description || prompt,
      type: type as "web" | "mobile" | "dashboard",
      status: "ready",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Save research
    if (result.research) {
      await db.insert(conversations).values({
        id: crypto.randomUUID(),
        projectId: newId,
        role: "system",
        content: `RESEARCH REPORT:\n${JSON.stringify(result.research, null, 2)}`,
        model: "hermes/research",
        createdAt: new Date(),
      });
    }

    // 6. Save specs
    if (result.specs) {
      await db.insert(conversations).values({
        id: crypto.randomUUID(),
        projectId: newId,
        role: "system",
        content: `SPECS:\n${JSON.stringify(result.specs, null, 2)}`,
        model: "hermes/specs",
        createdAt: new Date(),
      });
    }

    // 7. Save files
    if (result.files && result.files.length > 0) {
      for (const file of result.files) {
        await db.insert(projectFiles).values({
          id: crypto.randomUUID(),
          projectId: newId,
          path: file.path,
          content: file.content,
          createdAt: new Date(),
        });
      }
    }

    // 8. Save tests
    if (result.tests && result.tests.length > 0) {
      await db.insert(conversations).values({
        id: crypto.randomUUID(),
        projectId: newId,
        role: "system",
        content: `TESTS:\n${JSON.stringify(result.tests, null, 2)}`,
        model: "hermes/tests",
        createdAt: new Date(),
      });
    }

    // 9. Save wiki
    if (result.wiki && result.wiki.length > 0) {
      for (const page of result.wiki) {
        await db.insert(wikiPages).values({
          id: crypto.randomUUID(),
          projectId: newId,
          title: page.title,
          content: page.content,
          createdAt: new Date(),
        });
      }
    }

    // 10. Log user prompt
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId: newId,
      role: "user",
      content: prompt,
      model: "user",
      createdAt: new Date(),
    });

    // 11. Log Kelly response
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId: newId,
      role: "assistant",
      content: `Kelly (Hermes) generated ${result.files?.length || 0} files, ${result.tests?.length || 0} tests, ${result.wiki?.length || 0} wiki pages.`,
      model: "hermes/kelly",
      createdAt: new Date(),
    });

    console.log("[Kelly Orchestrate] Success! Project:", newId, "Files:", result.files?.length || 0);

    return NextResponse.json({
      success: true,
      projectId: newId,
      projectName: shortName,
      message: `🚀 Kelly built ${result.projectName} with ${result.files?.length || 0} files!`,
      stats: {
        files: result.files?.length || 0,
        tests: result.tests?.length || 0,
        wiki: result.wiki?.length || 0,
      },
    });

  } catch (error: any) {
    console.error("[Kelly Orchestrate] Error:", error);
    return NextResponse.json(
      { error: "Kelly orchestration failed", message: error.message },
      { status: 500 }
    );
  }
}

function parseHermesResponse(stdout: string): any {
  try {
    // Extract JSON from stdout
    // Kelly might wrap it in markdown code blocks or add extra text
    let content = stdout;

    // Try to find JSON between code blocks
    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      content = codeBlockMatch[1];
    } else {
      // Try to find JSON between braces
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
    }

    // Clean up common issues
    content = content
      .replace(/\n\s*\n/g, "\n") // Remove extra blank lines
      .trim();

    return JSON.parse(content);
  } catch (err) {
    console.error("[Kelly Orchestrate] JSON parse error:", err);
    console.log("[Kelly Orchestrate] Content attempted:", stdout.substring(0, 500));
    return null;
  }
}
