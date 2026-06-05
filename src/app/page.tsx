import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PromptBox } from "@/components/PromptBox";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ProjectGrid } from "@/components/ProjectGrid";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function Home() {
  const authData = await auth();
  const userId = authData.userId;
  
  let userProjects: any[] = [];
  if (userId) {
    userProjects = await db.select().from(projects).where(eq(projects.userId, userId));
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      <DashboardHeader user={userId ? { id: userId } : null} />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-12 text-center">
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
          What would you build?
        </h1>
        <p className="text-xl text-gray-700 mb-4 max-w-2xl mx-auto">
          AI-powered app builder. Web, mobile, backend — describe it, we build it.
        </p>
        <div className="flex items-center justify-center gap-4 text-base text-gray-600 mb-12">
          <span className="flex items-center gap-1">⚡ Instant preview</span>
          <span className="flex items-center gap-1">📱 Mobile + Web</span>
          <span className="flex items-center gap-1">🤖 Multi-LLM</span>
          <span className="flex items-center gap-1">🔗 GitHub export</span>
        </div>
        
        <PromptBox />
      </div>
      
      {/* Projects Grid */}
      {userId && userProjects.length > 0 && (
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Projects</h2>
          <ProjectGrid projects={userProjects} />
        </div>
      )}
      
      {/* Features */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon="🧠"
            title="AI Research First"
            description="Auto-researches top apps in your space before building. No more guessing."
          />
          <FeatureCard 
            icon="📱"
            title="Mobile + Web"
            description="Generate React Native apps or Next.js websites from the same prompt."
          />
          <FeatureCard 
            icon="🤖"
            title="Multi-LLM Power"
            description="Routes to the best AI model for the job — Kimi, DeepSeek, GPT-4o, Claude."
          />
          <FeatureCard 
            icon="🔧"
            title="Auto-Test Agent"
            description="AI tests every screen, finds bugs, fixes them before you see them."
          />
          <FeatureCard 
            icon="📚"
            title="Living Wiki"
            description="Auto-generated docs that update as your code changes. Never outdated."
          />
          <FeatureCard 
            icon="🧬"
            title="Second Brain"
            description="Remembers your preferences, suggests before you ask, learns your style."
          />
        </div>
      </div>
      
      {/* CTA */}
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 text-sm">
          Built with Next.js 15 · React 19 · TypeScript · Tailwind · shadcn/ui · OpenClaw
        </p>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white/80 border border-gray-200 rounded-xl p-6 hover:border-cyan-500/50 transition-colors shadow-sm">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-base">{description}</p>
    </div>
  );
}
