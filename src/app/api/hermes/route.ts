import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { tasks, agents, skills, projectFiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

// Hermes Integration Protocol — Task execution with learning loop
export async function POST(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, taskId, agentId, result, error } = body;

    switch (action) {
      case "claim":
        return claimTask(taskId, agentId);
      case "heartbeat":
        return agentHeartbeat(agentId);
      case "execute":
        return executeTask(taskId, agentId);
      case "report":
        return reportResult(taskId, result, error);
      case "learn":
        return learnFromExecution(body);
      case "get_skills":
        return getRelevantSkills(agentId, body.context);
      case "spawn":
        return spawnAgent(body);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("Hermes protocol error:", err);
    return NextResponse.json({ error: "Protocol failure" }, { status: 500 });
  }
}

// ─── Actions ───

async function claimTask(taskId: string, agentId: string) {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.status !== "pending" && task.status !== "ready") {
    return NextResponse.json({ error: `Task is ${task.status}` }, { status: 409 });
  }

  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent || agent.status !== "idle") {
    return NextResponse.json({ error: "Agent unavailable" }, { status: 409 });
  }

  // Atomic claim
  await db.update(tasks).set({
    status: "running",
    agentId,
    startedAt: new Date(),
    attempts: (task.attempts || 0) + 1,
  }).where(eq(tasks.id, taskId));

  await db.update(agents).set({ status: "busy" }).where(eq(agents.id, agentId));

  return NextResponse.json({
    claimed: true,
    task: {
      ...task,
      input: task.input ? JSON.parse(task.input) : null,
    },
    agent: { id: agent.id, name: agent.name, type: agent.type },
  });
}

async function agentHeartbeat(agentId: string) {
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  await db.update(agents).set({
    lastHeartbeat: new Date(),
  }).where(eq(agents.id, agentId));

  // Check if agent has been running too long (stuck detection)
  const runningTasks = await db.select().from(tasks).where(
    and(eq(tasks.agentId, agentId), eq(tasks.status, "running"))
  );

  const stuck = runningTasks.filter(t => {
    const started = t.startedAt ? new Date(t.startedAt).getTime() : 0;
    return Date.now() - started > 10 * 60 * 1000; // 10 min timeout
  });

  if (stuck.length > 0) {
    for (const st of stuck) {
      await db.update(tasks).set({
        status: "failed",
        errorLog: (st.errorLog || "") + "\n[TIMEOUT] Agent heartbeat lost",
      }).where(eq(tasks.id, st.id));
    }
    await db.update(agents).set({ status: "idle" }).where(eq(agents.id, agentId));
  }

  return NextResponse.json({
    alive: true,
    status: agent.status,
    runningTasks: runningTasks.length,
    stuckTasks: stuck.length,
  });
}

async function executeTask(taskId: string, agentId: string) {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Get relevant skills for this task type
  const relevantSkills = await getSkillsForTask(task);

  // Get project files for context
  const files = await db.select().from(projectFiles).where(eq(projectFiles.projectId, task.projectId));

  return NextResponse.json({
    task: {
      id: task.id,
      type: task.type,
      title: task.title,
      description: task.description,
      input: task.input ? JSON.parse(task.input) : null,
    },
    skills: relevantSkills,
    context: {
      projectId: task.projectId,
      existingFiles: files.map(f => ({ path: f.path, language: f.language })),
      stack: task.type === "mobile" ? "expo-54" : "nextjs-15",
    },
    protocol: {
      // Hermes execution rules
      rules: [
        "Always validate code before returning (lint, type-check)",
        "If error occurs, retry with modified approach (max 3 attempts)",
        "Use shared skills when available instead of regenerating",
        "Report partial progress if task is large",
        "Persist new patterns as skills on success",
      ],
      outputFormat: {
        files: [{ path: "string", content: "string", language: "string" }],
        description: "string",
        newSkills: [{ name: "string", category: "string", code: "string", trigger: "string" }],
      },
    },
  });
}

async function reportResult(taskId: string, result: any, error: string | null) {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (error) {
    // Check retry count
    const attempts = (task.attempts || 0);
    const maxAttempts = task.maxAttempts || 3;

    if (attempts < maxAttempts) {
      // Retry with error context
      await db.update(tasks).set({
        status: "retrying",
        errorLog: (task.errorLog || "") + "\n[Attempt " + attempts + "] " + error,
        output: JSON.stringify({ error, attempt: attempts }),
      }).where(eq(tasks.id, taskId));

      // Free agent for retry
      if (task.agentId) {
        await db.update(agents).set({ status: "idle" }).where(eq(agents.id, task.agentId));
      }

      return NextResponse.json({ status: "retrying", attemptsLeft: maxAttempts - attempts });
    } else {
      // Max retries exceeded — mark failed
      await db.update(tasks).set({
        status: "failed",
        errorLog: (task.errorLog || "") + "\n[FAILED] " + error,
        completedAt: new Date(),
      }).where(eq(tasks.id, taskId));

      if (task.agentId) {
        await db.update(agents).set({ status: "idle" }).where(eq(agents.id, task.agentId));
      }

      return NextResponse.json({ status: "failed", error });
    }
  }

  // Success
  await db.update(tasks).set({
    status: "completed",
    output: JSON.stringify(result),
    completedAt: new Date(),
  }).where(eq(tasks.id, taskId));

  if (task.agentId) {
    await db.update(agents).set({ status: "idle" }).where(eq(agents.id, task.agentId));
  }

  // Auto-persist any skills reported by the agent
  if (result?.newSkills && Array.isArray(result.newSkills)) {
    for (const skill of result.newSkills) {
      await persistSkill(task.agentId, skill, task.projectId);
    }
  }

  // Check if dependent tasks are now unblocked
  const dependentTasks = await db.select().from(tasks).where(eq(tasks.parentTaskId, taskId));
  for (const dep of dependentTasks) {
    // Check if all dependencies are completed
    // (simplified: just mark as ready)
    await db.update(tasks).set({ status: "ready" }).where(eq(tasks.id, dep.id));
  }

  return NextResponse.json({ status: "completed", taskId });
}

async function persistSkill(agentId: string | null, skill: any, projectId: string) {
  try {
    const skillId = randomUUID();
    await db.insert(skills).values({
      id: skillId,
      agentId: agentId || null,
      name: skill.name,
      description: skill.description || `Auto-generated skill from project ${projectId}`,
      category: skill.category || "general",
      code: skill.code || "",
      triggerPatterns: JSON.stringify(skill.trigger || []),
      successCount: 0,
      failureCount: 0,
      contextRequired: JSON.stringify(skill.contextRequired || []),
      isShared: skill.isShared ? true : false,
      version: 1,
    });
    return skillId;
  } catch (err) {
    console.error("Persist skill error:", err);
    return null;
  }
}

async function learnFromExecution(body: any) {
  const { agentId, skill, taskType, success, error } = body;

  // Update skill success/failure stats
  if (skill?.id) {
    const existing = await db.select().from(skills).where(eq(skills.id, skill.id)).get();
    if (existing) {
      await db.update(skills).set({
        successCount: success ? (existing.successCount || 0) + 1 : existing.successCount,
        failureCount: !success ? (existing.failureCount || 0) + 1 : existing.failureCount,
        updatedAt: new Date(),
      }).where(eq(skills.id, skill.id));
    }
  }

  // If failure, create a new skill variant with the fix
  if (!success && error && skill) {
    const newSkill = {
      id: randomUUID(),
      agentId: agentId || null,
      name: skill.name + " (v" + ((skill.version || 1) + 1) + ")",
      description: skill.description + "\nFix for: " + error.substring(0, 200),
      category: skill.category,
      code: skill.code,
      triggerPatterns: JSON.stringify([...(JSON.parse(skill.triggerPatterns || "[]")), error.substring(0, 100)]),
      contextRequired: skill.contextRequired,
      version: (skill.version || 1) + 1,
    };
    await db.insert(skills).values(newSkill);
  }

  return NextResponse.json({ learned: true, skillUpdated: skill?.id });
}

async function getRelevantSkills(agentId: string, context: any) {
  const allSkills = await db.select().from(skills).where(eq(skills.isShared, true));

  // Score skills by relevance to context
  const scored = allSkills.map(s => {
    let score = 0;
    const patterns = JSON.parse(s.triggerPatterns || "[]") as string[];

    // Match context keywords against trigger patterns
    const contextStr = JSON.stringify(context).toLowerCase();
    for (const pattern of patterns) {
      if (contextStr.includes(pattern.toLowerCase())) score += 2;
    }

    // Prefer high-success skills
    const totalUses = (s.successCount || 0) + (s.failureCount || 0);
    if (totalUses > 0) {
      score += ((s.successCount || 0) / totalUses) * 3;
    }

    // Prefer newer versions
    score += (s.version || 1) * 0.1;

    return { ...s, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    skills: scored.slice(0, 5).map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      code: s.code,
      successRate: s.successCount && s.successCount + s.failureCount! > 0
        ? s.successCount / (s.successCount + s.failureCount!)
        : null,
    })),
  });
}

async function spawnAgent(body: any) {
  const { name, type, capabilities, metadata } = body;

  const agentId = randomUUID();
  await db.insert(agents).values({
    id: agentId,
    name: name || `Agent-${type}-${Date.now()}`,
    type: type || "hermes",
    status: "idle",
    capabilities: JSON.stringify(capabilities || []),
    metadata: JSON.stringify(metadata || {}),
  });

  return NextResponse.json({
    agentId,
    status: "spawned",
    endpoint: "/api/hermes",
    instructions: "Use /api/hermes with action=claim to get tasks, action=execute to get context, action=report to submit results.",
  });
}

// ─── Helpers ───

async function getSkillsForTask(task: any) {
  const category = task.type === "code" ? "react" :
                   task.type === "test" ? "testing" :
                   task.type === "deploy" ? "deployment" : "general";

  const relevant = await db.select().from(skills).where(eq(skills.category, category));

  // Also get shared skills that match the task input
  const input = task.input ? JSON.stringify(task.input).toLowerCase() : "";
  const shared = await db.select().from(skills).where(eq(skills.isShared, true));

  const matched = shared.filter(s => {
    const patterns = JSON.parse(s.triggerPatterns || "[]") as string[];
    return patterns.some(p => input.includes(p.toLowerCase()));
  });

  return [...relevant.slice(0, 3), ...matched.slice(0, 3)];
}

// GET: List all agents and their status
export async function GET(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allAgents = await db.select().from(agents);
    const allTasks = await db.select().from(tasks);

    const agentStats = allAgents.map(a => ({
      ...a,
      capabilities: a.capabilities ? JSON.parse(a.capabilities) : [],
      metadata: a.metadata ? JSON.parse(a.metadata) : {},
      activeTasks: allTasks.filter(t => t.agentId === a.id && t.status === "running").length,
      completedTasks: allTasks.filter(t => t.agentId === a.id && t.status === "completed").length,
      failedTasks: allTasks.filter(t => t.agentId === a.id && t.status === "failed").length,
    }));

    return NextResponse.json({ agents: agentStats });
  } catch (error) {
    console.error("List agents error:", error);
    return NextResponse.json({ error: "Failed to list agents" }, { status: 500 });
  }
}
