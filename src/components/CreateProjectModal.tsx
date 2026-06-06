'use client';

import { useState } from 'react';
import { X, Folder, Globe, Smartphone, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'web' | 'mobile' | 'dashboard'>('web');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isLoading) return;

    setIsLoading(true);
    try {
      // First, create the project
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          type,
        }),
      });

      const createData = await createRes.json();
      
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || 'Failed to create project');
      }

      const projectId = createData.project.id;

      // Then, generate initial code if description is provided
      if (description?.trim()) {
        await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            prompt: description,
            type,
          }),
        });
      }

      router.push(`/project/${projectId}`);
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
      alert(err instanceof Error ? err.message : 'Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const typeOptions = [
    { value: 'web' as const, label: 'Web App', icon: Globe, desc: 'Next.js + Tailwind + shadcn/ui' },
    { value: 'mobile' as const, label: 'Mobile App', icon: Smartphone, desc: 'Expo SDK 54 + React Native' },
    { value: 'dashboard' as const, label: 'Dashboard', icon: Layers, desc: 'Analytics + Data visualization' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 font-[family-name:var(--font-playfair)]">Create New Project</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Recipe Tracker, Stock Dashboard..."
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Description
              <span className="text-xs text-gray-400 ml-1">(optional, helps AI understand)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your app should do..."
              className="w-full h-24 bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">App Type</label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                      type === option.value
                        ? 'bg-blue-50 border-blue-300 text-blue-600'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{option.label}</span>
                    <span className="text-[10px] text-gray-400">{option.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
