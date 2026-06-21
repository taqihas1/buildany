import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PromptBox } from "@/components/PromptBox";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ProjectGrid } from "@/components/ProjectGrid";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { KellyWelcomePanel } from "@/components/KellyWelcomePanel";

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
        <h1 className="font-display text-5xl md:text-7xl font-medium bg-gradient-to-r from-black via-gray-900 to-gray-700 bg-clip-text text-transparent mb-6 tracking-tight">
          What would you build?
        </h1>
        <p className="font-sans-ui text-xl text-vogue-gray mb-4 max-w-2xl mx-auto leading-relaxed">
          Kelly (Brain) + Morgan (Executor) — describe your app, we build it.
        </p>
        <div className="font-sans-ui flex items-center justify-center gap-4 text-sm text-vogue-light-gray mb-8">
          <span className="flex items-center gap-1">⚡ Instant preview</span>
          <span className="flex items-center gap-1">📱 Mobile + Web</span>
          <span className="flex items-center gap-1">🧠 Kelly AI</span>
          <span className="flex items-center gap-1">🔗 GitHub export</span>
        </div>
        
        {/* Kelly Welcome Panel */}
        <div className="max-w-2xl mx-auto mb-8">
          <KellyWelcomePanel />
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
            title="Kelly — The Brain"
            description="AI architect that researches, plans, and designs your app before a single line of code is written."
          />
          <FeatureCard 
            icon="📱"
            title="Mobile + Web"
            description="Generate React Native apps or Next.js websites from the same prompt."
          />
          <FeatureCard 
            icon="🤖"
            title="Morgan — The Executor"
            description="Security audits, bulk fixes, refactoring, and automated testing. The muscle behind the brain."
          />
          <FeatureCard 
            icon="🔧"
            title="Ponytail Code"
            description="Minimalist code generation — 54% less code, 20% cheaper, 27% faster. No bloat, no YAGNI."
          />
          <FeatureCard 
            icon="📚"
            title="Living Wiki"
            description="Auto-generated docs that update as your code changes. Kelly remembers everything."
          />
          <FeatureCard 
            icon="🧬"
            title="Second Brain"
            description="Remembers your preferences, suggests before you ask, learns your style across projects."
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
    <div className="bg-white border border-gray-100 rounded-xl p-6 hover:border-black transition-colors shadow-sm">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-display text-lg font-medium text-vogue-black mb-2">{title}</h3>
      <p className="font-sans-ui text-vogue-gray text-base">{description}</p>
    </div>
  );
}
