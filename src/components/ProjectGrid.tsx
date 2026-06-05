"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, Globe, Smartphone, GitBranch } from "lucide-react";
import { CreateProjectModal } from "./CreateProjectModal";

export function ProjectGrid({ projects }: { projects: any[] }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => router.push(`/project/${project.id}`)}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-cyan-500/50 cursor-pointer transition-all group shadow-sm hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {project.type === "mobile" ? (
                  <Smartphone className="w-5 h-5 text-purple-500" />
                ) : (
                  <Globe className="w-5 h-5 text-cyan-500" />
                )}
                <h3 className="font-medium text-gray-900 group-hover:text-cyan-600 transition-colors">
                  {project.name}
                </h3>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                project.status === "ready" 
                  ? "bg-green-100 text-green-600" 
                  : "bg-yellow-100 text-yellow-600"
              }`}>
                {project.status}
              </span>
            </div>
            
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{project.description}</p>
            
            <div className="flex items-center gap-3 text-xs text-gray-400">
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
          onClick={() => setIsModalOpen(true)}
          className="bg-white/50 border border-dashed border-gray-300 rounded-xl p-4 hover:border-cyan-500/50 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px]"
        >
          <Folder className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-400">New Project</span>
        </div>
      </div>
      
      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
