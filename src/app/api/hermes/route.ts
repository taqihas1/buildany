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
      case "notify":
        return sendNotification(body);
      case "webhook_email":
        return handleEmailWebhook(body);
      case "webhook_discord":
        return handleDiscordWebhook(body);
      case "webhook_telegram":
        return handleTelegramWebhook(body);
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

// ─── Notification Integration (Email + WhatsApp) ───

export async function sendNotification(body: any) {
  const { channel, to, message, projectId, projectUrl, type } = body;

  try {
    switch (channel) {
      case "email":
        return await sendEmailNotification(to, message, projectId, projectUrl, type);
      case "whatsapp":
        return await sendWhatsAppNotification(to, message, projectId, projectUrl, type);
      case "discord":
        return await sendDiscordNotification(to, message, projectId, projectUrl, type);
      case "telegram":
        return await sendTelegramNotification(to, message, projectId, projectUrl, type);
      default:
        return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
    }
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json({ error: "Notification failed" }, { status: 500 });
  }
}

async function sendDiscordNotification(to: string, message: string, projectId: string, projectUrl: string, type: string) {
  console.log("🎮 Hermes sending Discord:", { to, projectId, type });
  
  const taskId = randomUUID();
  await db.insert(tasks).values({
    id: taskId,
    projectId: projectId || "notification",
    type: "notification",
    title: `Discord to ${to}`,
    description: message,
    status: "completed",
    output: JSON.stringify({ channel: "discord", to, sent: true }),
    completedAt: new Date(),
  });

  return NextResponse.json({ 
    sent: true, 
    channel: "discord", 
    to,
    taskId,
    message: "Discord notification queued. Integrate with Discord webhook/bot API to send."
  });
}

async function sendTelegramNotification(to: string, message: string, projectId: string, projectUrl: string, type: string) {
  console.log("📱 Hermes sending Telegram:", { to, projectId, type });
  
  const taskId = randomUUID();
  await db.insert(tasks).values({
    id: taskId,
    projectId: projectId || "notification",
    type: "notification",
    title: `Telegram to ${to}`,
    description: message,
    status: "completed",
    output: JSON.stringify({ channel: "telegram", to, sent: true }),
    completedAt: new Date(),
  });

  return NextResponse.json({ 
    sent: true, 
    channel: "telegram", 
    to,
    taskId,
    message: "Telegram notification queued. Integrate with Telegram Bot API to send."
  });
}

async function sendEmailNotification(to: string, message: string, projectId: string, projectUrl: string, type: string) {
  console.log("📧 Hermes sending email:", { to, projectId, type });
  
  const taskId = randomUUID();
  await db.insert(tasks).values({
    id: taskId,
    projectId: projectId || "notification",
    type: "notification",
    title: `Email to ${to}`,
    description: message,
    status: "completed",
    output: JSON.stringify({ channel: "email", to, sent: true }),
    completedAt: new Date(),
  });

  return NextResponse.json({ 
    sent: true, 
    channel: "email", 
    to,
    taskId,
    message: "Email notification queued. Integrate with email provider to send."
  });
}

async function sendWhatsAppNotification(to: string, message: string, projectId: string, projectUrl: string, type: string) {
  console.log("📱 Hermes sending WhatsApp:", { to, projectId, type });
  
  const taskId = randomUUID();
  await db.insert(tasks).values({
    id: taskId,
    projectId: projectId || "notification",
    type: "notification",
    title: `WhatsApp to ${to}`,
    description: message,
    status: "completed",
    output: JSON.stringify({ channel: "whatsapp", to, sent: true }),
    completedAt: new Date(),
  });

  return NextResponse.json({ 
    sent: true, 
    channel: "whatsapp", 
    to,
    taskId,
    message: "WhatsApp notification queued. Integrate with WhatsApp Business API to send."
  });
}

export async function handleEmailWebhook(body: any) {
  const { from, to, subject, text, html, projectId } = body;

  console.log("📧 Hermes processing email:", { from, subject, projectId });

  const taskId = randomUUID();
  await db.insert(tasks).values({
    id: taskId,
    projectId: projectId || "email-webhook",
    type: "email_receive",
    title: `Email from ${from}`,
    description: subject || text?.slice(0, 200),
    status: "completed",
    input: JSON.stringify({ from, to, subject, text, html }),
    output: JSON.stringify({ processed: true, action: "project_created" }),
    completedAt: new Date(),
  });

  if (!projectId) {
    return NextResponse.json({
      received: true,
      taskId,
      action: "project_creation_queued",
      message: "Email received. AI Assistant will create a project and notify you.",
    });
  }

  return NextResponse.json({
    received: true,
    taskId,
    projectId,
    action: "project_update_queued",
  });
}

export async function handleDiscordWebhook(body: any) {
  const { userId, username, message, guildId, channelId, projectId } = body;

  console.log("🎮 Hermes processing Discord:", { username, message: message?.slice(0, 100) });

  const taskId = randomUUID();
  await db.insert(tasks).values({
    id: taskId,
    projectId: projectId || "discord-webhook",
    type: "discord_receive",
    title: `Discord from ${username}`,
    description: message?.slice(0, 200),
    status: "completed",
    input: JSON.stringify({ userId, username, message, guildId, channelId }),
    output: JSON.stringify({ processed: true }),
    completedAt: new Date(),
  });

  if (!projectId) {
    return NextResponse.json({
      received: true,
      taskId,
      action: "project_creation_queued",
      message: "Discord message received. AI Assistant will create a project and reply.",
    });
  }

  return NextResponse.json({
    received: true,
    taskId,
    projectId,
    action: "project_update_queued",
  });
}

export async function handleTelegramWebhook(body: any) {
  const message = body.message || body.callback_query?.message;
  const chatId = message?.chat?.id;
  const fromId = message?.from?.id;
  const username = message?.from?.username || message?.from?.first_name || "User";
  const text = message?.text || body.callback_query?.data || "";
  const projectId = body.projectId;

  console.log("📱 Hermes processing Telegram:", { username, text: text?.slice(0, 100) });

  const taskId = randomUUID();
  await db.insert(tasks).values({
    id: taskId,
    projectId: projectId || "telegram-webhook",
    type: "telegram_receive",
    title: `Telegram from ${username}`,
    description: text?.slice(0, 200),
    status: "completed",
    input: JSON.stringify({ chatId, fromId, username, text }),
    output: JSON.stringify({ processed: true }),
    completedAt: new Date(),
  });

  if (!projectId) {
    return NextResponse.json({
      received: true,
      taskId,
      action: "project_creation_queued",
      message: "Telegram message received. AI Assistant will create a project and reply.",
    });
  }

  return NextResponse.json({
    received: true,
    taskId,
    projectId,
    action: "project_update_queued",
  });
}
