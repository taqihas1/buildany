import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, projectFiles, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const authData = await auth();
  const userId = authData.userId;
  
  const project = await db.select().from(projects).where(eq(projects.id, id)).get();
  
  if (!project) {
    notFound();
  }

  const files = await db.select().from(projectFiles).where(eq(projectFiles.projectId, id));
  const chatHistory = await db.select().from(conversations).where(eq(conversations.projectId, id));

  return (
    <ProjectWorkspace 
      project={project} 
      files={files} 
      chatHistory={chatHistory}
      user={userId ? { id: userId } : null}
    />
  );
}
