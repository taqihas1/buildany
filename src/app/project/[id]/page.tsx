import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { projects, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Workspace3Col } from "@/components/Workspace3Col";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const PROJECTS_DIR = "/data/projects";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ prompt?: string }>;
}

async function getProjectFiles(projectId: string) {
  try {
    const projectDir = path.join(PROJECTS_DIR, projectId);
    await fs.access(projectDir);
    return await listDirRecursive(projectDir, projectDir);
  } catch {
    return [];
  }
}

async function listDirRecursive(dir: string, rootDir: string): Promise<any[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result: any[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath);
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "out") continue;
    if (entry.isDirectory()) {
      const children = await listDirRecursive(fullPath, rootDir);
      result.push({ name: entry.name, path: relPath, type: "directory", children });
    } else {
      result.push({ name: entry.name, path: relPath, type: "file" });
    }
  }
  return result;
}

export default async function ProjectPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { prompt } = await searchParams;

  const project = await db.select().from(projects).where(eq(projects.id, id)).get();

  if (!project) {
    notFound();
  }

  const chatHistory = await db.select().from(conversations).where(eq(conversations.projectId, id));
  const files = await getProjectFiles(id);

  // If prompt was passed in URL but no DB conversations exist, save it now
  // This ensures the prompt persists even if the initial API call failed to save it
  let hasSavedPrompt = false;
  if (prompt && chatHistory.length === 0) {
    await db.insert(conversations).values({
      id: crypto.randomUUID(),
      projectId: id,
      role: "user",
      content: prompt,
      createdAt: new Date(),
    });
    hasSavedPrompt = true;
  }

  // Convert DB messages to workspace format
  const messages = chatHistory.map(c => ({
    id: c.id,
    role: c.role as "user" | "assistant" | "system",
    content: c.content,
  }));

  // If we just saved the prompt, include it in initial messages
  const initialMessages = hasSavedPrompt
    ? [...messages, { id: "init", role: "user" as const, content: prompt! }]
    : messages.length > 0
    ? messages
    : prompt
    ? [{ id: "init", role: "user" as const, content: prompt }]
    : messages;

  return (
    <Workspace3Col
      project={project}
      initialFiles={files}
      initialChat={initialMessages}
      user={null}
    />
  );
}
