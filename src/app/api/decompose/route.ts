import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { tasks, agents, projects, projectFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Task Decomposition Router — breaks a project into tasks and assigns to agents
export async function POST(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, prompt, type = "web" } = body;

    // Get project context
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get existing files for context
    const files = await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId));
    const fileList = files.map(f => f.path).join("\n");

    // Find available agents — create defaults if none exist
    let availableAgents = await db.select().from(agents).where(eq(agents.status, "idle"));
    
    // If no idle agents, try any agents
    if (availableAgents.length === 0) {
      availableAgents = await db.select().from(agents).all();
    }
    
    // Create default agents for this project if none exist at all
    if (availableAgents.length === 0) {
      const defaultAgentTypes = type === "mobile" 
        ? [{ name: "Hermes", type: "hermes" }, { name: "Code Agent", type: "code" }]
        : [{ name: "Html Agent", type: "html" }, { name: "Css Agent", type: "css" }, { name: "Js Agent", type: "javascript" }];
      
      for (const def of defaultAgentTypes) {
        const agentId = randomUUID();
        await db.insert(agents).values({
          id: agentId,
          name: def.name,
          type: def.type,
          status: "idle",
          capabilities: JSON.stringify([def.type, "build", "test"]),
          metadata: JSON.stringify({ projectId, createdBy: "decompose" }),
        });
        availableAgents.push({ id: agentId, name: def.name, type: def.type, status: "idle" });
      }
    }

    // Decompose project into tasks based on type and complexity
    const taskPlan = decomposeProject(prompt, type, fileList);

    // Create tasks in DB
    const createdTasks = [];
    for (const taskDef of taskPlan) {
      // Match best agent for task
      const bestAgent = matchAgentToTask(taskDef, availableAgents);

      const taskId = randomUUID();
      await db.insert(tasks).values({
        id: taskId,
        projectId,
        agentId: bestAgent?.id || null,
        type: taskDef.type,
        status: "pending",
        priority: taskDef.priority || 2,
        title: taskDef.title,
        description: taskDef.description,
        input: JSON.stringify({
          prompt: taskDef.prompt,
          fileList,
          projectType: type,
          context: taskDef.context,
        }),
        maxAttempts: 3,
      });

      createdTasks.push({
        id: taskId,
        title: taskDef.title,
        type: taskDef.type,
        description: taskDef.description,
        priority: taskDef.priority,
        context: taskDef.context,
        dependencies: taskDef.dependencies,
        assignedAgent: bestAgent?.name || "unassigned",
      });
    }

    // Mark first task as ready to start (no dependencies)
    const firstTasks = createdTasks.filter(t => !t.dependencies || t.dependencies.length === 0);
    for (const ft of firstTasks) {
      await db.update(tasks).set({ status: "ready" }).where(eq(tasks.id, ft.id));
    }

    return NextResponse.json({
      projectId,
      tasksCreated: createdTasks.length,
      tasks: createdTasks,
      executionOrder: calculateExecutionOrder(createdTasks),
      message: "Project decomposed into tasks. Ready for swarm execution.",
    });
  } catch (error) {
    console.error("Decomposition error:", error);
    return NextResponse.json({ error: "Failed to decompose project" }, { status: 500 });
  }
}

// Decompose a project into executable tasks
function decomposeProject(prompt: string, type: string, fileList: string) {
  const tasks = [];

  // Common tasks for all projects
  tasks.push({
    id: randomUUID(),
    type: "research",
    title: "Research & Pattern Analysis",
    description: "Research top apps in this space and extract UX patterns",
    prompt: `Research the best apps for: ${prompt}. Find top 5 competitors, their key features, UI patterns, and user complaints.`,
    priority: 5,
    context: { phase: "research" },
    dependencies: [],
  });

  // Architecture planning (depends on research)
  tasks.push({
    id: randomUUID(),
    type: "code",
    title: "Architecture & File Structure",
    description: "Design component hierarchy and file organization",
    prompt: `Design the file structure and component hierarchy for: ${prompt}. Type: ${type}.`,
    priority: 4,
    context: { phase: "architecture", needsResearch: true },
    dependencies: [tasks[0].id],
  });

  // Core screens / pages (depends on architecture)
  if (type === "mobile") {
    tasks.push({
      id: randomUUID(),
      type: "code",
      title: "Core Screens Implementation",
      description: "Build main screens with Expo SDK 54 + React Native 0.81.5",
      prompt: `Generate Expo SDK 54 compatible React Native screens for: ${prompt}. Follow architecture from previous task.`,
      priority: 4,
      context: { phase: "implementation", stack: "expo-54" },
      dependencies: [tasks[1].id],
    });

    tasks.push({
      id: randomUUID(),
      type: "code",
      title: "Navigation & State Management",
      description: "Add React Navigation and state management",
      prompt: `Add Expo Router navigation and Zustand/Context state management for: ${prompt}`,
      priority: 3,
      context: { phase: "navigation" },
      dependencies: [tasks[2].id],
    });
  } else {
    // Web tasks
    tasks.push({
      id: randomUUID(),
      type: "code",
      title: "Page Components",
      description: "Build main pages with Next.js + Tailwind + shadcn",
      prompt: `Generate Next.js 15 pages for: ${prompt}. Use Tailwind CSS and shadcn/ui components.`,
      priority: 4,
      context: { phase: "implementation", stack: "nextjs-15" },
      dependencies: [tasks[1].id],
    });

    tasks.push({
      id: randomUUID(),
      type: "code",
      title: "API Routes & Backend",
      description: "Build API endpoints and data layer",
      prompt: `Generate Next.js API routes and Drizzle ORM schema for: ${prompt}`,
      priority: 3,
      context: { phase: "backend" },
      dependencies: [tasks[2].id],
    });
  }

  // Testing (depends on implementation)
  tasks.push({
    id: randomUUID(),
    type: "test",
    title: "Pre-flight Validation",
    description: "Run expo-react-native-debug checks or Next.js build test",
    prompt: type === "mobile"
      ? "Run Expo SDK 54 pre-flight: check package.json versions, tsconfig paths, circular imports."
      : "Run Next.js build and TypeScript checks.",
    priority: 4,
    context: { phase: "testing" },
    dependencies: [tasks[3].id],
  });

  // Visual assets (parallel with testing)
  tasks.push({
    id: randomUUID(),
    type: "code",
    title: "Visual Assets & UI Polish",
    description: "Generate icons, splash screens, theme constants",
    prompt: `Generate app icons, splash screen, and theme constants for: ${prompt}.`,
    priority: 2,
    context: { phase: "assets" },
    dependencies: [tasks[2].id], // Can start after implementation begins
  });

  // CI/CD (parallel)
  tasks.push({
    id: randomUUID(),
    type: "deploy",
    title: "CI/CD Pipeline",
    description: "Generate GitHub Actions workflow for build + deploy",
    prompt: `Generate GitHub Actions workflow for ${type} app with auto-retry, EAS integration, and issue creation on failure.`,
    priority: 2,
    context: { phase: "cicd" },
    dependencies: [],
  });

  // Final review (depends on everything)
  tasks.push({
    id: randomUUID(),
    type: "review",
    title: "Final Review & Integration",
    description: "Review all files, fix imports, ensure consistency",
    prompt: "Review all generated files. Fix any import mismatches, ensure consistent styling, verify no placeholder content remains.",
    priority: 5,
    context: { phase: "review" },
    dependencies: tasks.slice(0, -1).map(t => t.id),
  });

  return tasks;
}

// Match agent capabilities to task requirements
function matchAgentToTask(taskDef: any, availableAgents: any[]) {
  if (availableAgents.length === 0) return null;

  // Hermes is best for code tasks
  if (taskDef.type === "code" || taskDef.type === "test") {
    return availableAgents.find(a => a.type === "hermes") || availableAgents[0];
  }

  // Any agent can do research/deploy
  return availableAgents.find(a => a.status === "idle") || availableAgents[0];
}

// Calculate DAG execution order (topological sort)
function calculateExecutionOrder(tasks: any[]) {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const inDegree = new Map(tasks.map(t => [t.id, (t.dependencies || []).length]));
  const adjList = new Map();

  for (const t of tasks) {
    adjList.set(t.id, []);
    for (const dep of t.dependencies || []) {
      adjList.get(dep)?.push(t.id);
    }
  }

  const queue = tasks.filter(t => (t.dependencies || []).length === 0).map(t => t.id);
  const order = [];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    order.push(curr);

    for (const neighbor of adjList.get(curr) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  return order.map(id => ({
    id,
    title: taskMap.get(id)?.title,
    type: taskMap.get(id)?.type,
  }));
}

// GET: List all tasks for a project with dependency graph
export async function GET(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));

    // Build dependency graph
    const graph = projectTasks.map(t => ({
      ...t,
      input: t.input ? JSON.parse(t.input) : null,
      output: t.output ? JSON.parse(t.output) : null,
      dependencies: projectTasks.filter(pt => pt.parentTaskId === t.id).map(pt => pt.id),
    }));

    return NextResponse.json({ tasks: graph });
  } catch (error) {
    console.error("List tasks error:", error);
    return NextResponse.json({ error: "Failed to list tasks" }, { status: 500 });
  }
}
