import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Workspace3Col } from "@/components/Workspace3Col";
import fs from "fs/promises";
import path from "path";

const PROJECTS_DIR = "/data/projects";

interface PageProps {
  params: Promise<{ id: string }>;
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

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const authData = await auth();
  const userId = authData.userId;

  const project = await db.select().from(projects).where(eq(projects.id, id)).get();

  if (!project) {
    notFound();
  }

  const chatHistory = await db.select().from(conversations).where(eq(conversations.projectId, id));
  const files = await getProjectFiles(id);

  // Convert DB messages to workspace format
  const messages = chatHistory.map(c => ({
    id: c.id,
    role: c.role as 'user' | 'assistant' | 'system',
    content: c.content,
  }));

  return (
    <Workspace3Col
      project={project}
      initialFiles={files}
      initialChat={messages}
      user={userId ? { id: userId } : null}
    />
  );
}
