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
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'kimi-k2p6',
    name: 'Kimi K2.6',
    description: 'Fast & versatile',
    icon: Zap,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Excellent for UI/UX',
    icon: Brain,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
];

export function LLMSelector({ selectedModel, onSelect }: LLMSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = models.find(m => m.id === selectedModel) || models[0];
  const SelectedIcon = selected.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-all ${selected.bgColor} border-slate-700 hover:border-slate-600`}
      >
        <SelectedIcon className={`w-4 h-4 ${selected.color}`} />
        <span className="text-slate-300">{selected.name}</span>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {models.map((model) => {
              const Icon = model.icon;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelect(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    selectedModel === model.id
                      ? 'bg-cyan-500/10'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${model.color}`} />
                  <div>
                    <div className="text-sm text-white">{model.name}</div>
                    <div className="text-xs text-slate-500">{model.description}</div>
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
