import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ChatOrchestratorPanel } from "@/components/ChatOrchestratorPanel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TestOrchestratorPage({ params }: PageProps) {
  const { id } = await params;
  const authData = await auth();
  const userId = authData.userId;
  
  const project = await db.select().from(projects).where(eq(projects.id, id)).get();
  
  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Orchestrator Test</h1>
        <p className="text-gray-600 mb-6">Project: {project.name}</p>
        
        <div className="border rounded-lg p-4 bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">Test Prompt: "Build a todo app"</h2>
          
          <ChatOrchestratorPanel
            projectId={id}
            prompt="Build a simple todo app with add, complete, and delete features"
            platform="web"
            onComplete={() => {
              console.log("Orchestrator completed!");
            }}
          />
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Test project ID: {id}</p>
          <p>Platform: {project.type}</p>
        </div>
      </div>
    </div>
  );
}
