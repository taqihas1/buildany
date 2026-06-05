import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const authData = await auth();
  const userId = authData.userId;
  
  if (!userId) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <DashboardHeader user={{ id: userId }} />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Settings className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>
          
          <div className="space-y-6">
            {/* API Keys Section */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">API Keys</h2>
              <p className="text-sm text-slate-400 mb-4">
                Configure your API keys for AI generation services.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">DeepSeek API Key</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">OpenAI API Key</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
            
            {/* GitHub Section */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">GitHub Integration</h2>
              <p className="text-sm text-slate-400 mb-4">
                Connect your GitHub account for code export.
              </p>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">GitHub Personal Access Token</label>
                <input
                  type="password"
                  placeholder="ghp_..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-xs text-slate-600 mt-1">
                  Required for exporting projects to GitHub repositories.
                </p>
              </div>
            </div>
            
            {/* Preferences */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Preferences</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white">Auto-research</div>
                    <div className="text-xs text-slate-500">Research competitors before building</div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white">Auto-deploy</div>
                    <div className="text-xs text-slate-500">Deploy to preview URL after generation</div>
                  </div>
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}