"use client";

import { useRouter } from "next/navigation";
import { Folder, Globe, Smartphone, GitBranch } from "lucide-react";

export function ProjectGrid({ projects }: { projects: any[] }) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => router.push(`/project/${project.id}`)}
          className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {project.type === "mobile" ? (
                <Smartphone className="w-5 h-5 text-purple-400" />
              ) : (
                <Globe className="w-5 h-5 text-cyan-400" />
              )}
              <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                {project.name}
              </h3>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              project.status === "ready" 
                ? "bg-green-500/10 text-green-400" 
                : "bg-yellow-500/10 text-yellow-400"
            }`}>
              {project.status}
            </span>
          </div>
          
          <p className="text-sm text-slate-400 line-clamp-2 mb-3">{project.description}</p>
          
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {project.githubRepo && (
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                GitHub
              </span>
            )}
            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
      
      {/* New Project Card */}
      <div
        onClick={() => router.push("/")}
        className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px]"
      >
        <Folder className="w-8 h-8 text-slate-600 mb-2" />
        <span className="text-sm text-slate-500">New Project</span>
      </div>
    </div>
  );
}
