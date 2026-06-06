'use client';

import { useState } from 'react';
import { Cpu, ChevronDown, Zap, Brain, Code } from 'lucide-react';

interface LLMSelectorProps {
  selectedModel: string;
  onSelect: (model: string) => void;
}

const models = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    description: 'Best for coding & research',
    icon: Code,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'kimi-k2p6',
    name: 'Kimi K2.6',
    description: 'Fast & versatile',
    icon: Zap,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Excellent for UI/UX',
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'gemma-4',
    name: 'Gemma 4',
    description: 'Local fallback (free)',
    icon: Cpu,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
];

export function LLMSelector({ selectedModel, onSelect }: LLMSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedModel') || selectedModel || 'deepseek-chat';
    }
    return selectedModel || 'deepseek-chat';
  });
  
  const selected = models.find(m => m.id === currentModel) || models[0];
  const SelectedIcon = selected.icon;
  
  const handleSelect = (modelId: string) => {
    setCurrentModel(modelId);
    onSelect(modelId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedModel', modelId);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${selected.bgColor} border-gray-200 hover:border-gray-300`}
      >
        <SelectedIcon className={`w-4 h-4 ${selected.color}`} />
        <span className="text-gray-700">{selected.name}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
            {models.map((model) => {
              const Icon = model.icon;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    handleSelect(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    currentModel === model.id
                      ? 'bg-cyan-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${model.color}`} />
                  <div>
                    <div className="text-sm text-gray-900">{model.name}</div>
                    <div className="text-xs text-gray-500">{model.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
