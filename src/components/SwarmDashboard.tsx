'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bot, Play, Square, Cpu, GitBranch, Zap, Layers, 
  CheckCircle, XCircle, RotateCcw, ArrowRight, Plus,
  Terminal, Sparkles, BrainCircuit, Puzzle, Code2
} from 'lucide-react';

interface SwarmDashboardProps {
  projectId?: string;
}

export function SwarmDashboard({ projectId }: SwarmDashboardProps) {
  const [agents, setAgents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'agents' | 'tasks' | 'skills'>('agents');
  const router = useRouter();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, [projectId]);

  const loadData = async () => {
    try {
      const [agentsRes, tasksRes, skillsRes] = await Promise.all([
        fetch('/api/hermes'),
        projectId ? fetch(`/api/decompose?projectId=${projectId}`) : Promise.resolve({ json: () => ({ tasks: [] }) }),
        fetch('/api/skills?shared=true'),
      ]);

      const agentsData = await agentsRes.json();
      const tasksData = await tasksRes.json();
      const skillsData = await skillsRes.json();

      setAgents(agentsData.agents || []);
      setTasks(tasksData.tasks || []);
      setSkills(skillsData.skills || []);
    } catch (err) {
      console.error('Swarm data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const spawnAgent = async (type: string) => {
    try {
      const res = await fetch('/api/hermes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'spawn', name: `${type}-agent-${Date.now()}`, type }),
      });
      const data = await res.json();
      if (data.agentId) loadData();
    } catch (err) {
      console.error('Spawn error:', err);
    }
  };

  const decomposeProject = async () => {
    if (!projectId) return;
    try {
      const res = await fetch('/api/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, prompt: 'Decompose current project', type: 'web' }),
      });
      const data = await res.json();
      if (data.tasksCreated) loadData();
    } catch (err) {
      console.error('Decompose error:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <Cpu className="w-6 h-6 animate-spin mr-2" />
        Loading swarm state...
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    idle: 'bg-emerald-500',
    busy: 'bg-amber-500',
    offline: 'bg-slate-500',
    pending: 'bg-slate-600',
    ready: 'bg-cyan-500',
    running: 'bg-blue-500',
    completed: 'bg-emerald-500',
    failed: 'bg-red-500',
    retrying: 'bg-amber-500',
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 border-l border-slate-800">
      {/* Header */}
      <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Agent Swarm</span>
          <span className="text-sm bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full">
            {agents.length} agents • {tasks.length} tasks
          </span>
        </div>
        <div className="flex gap-1">
          {(['agents', 'tasks', 'skills'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-sm rounded transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === 'agents' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-slate-500 uppercase">Active Agents</span>
              <div className="flex gap-1">
                <button
                  onClick={() => spawnAgent('hermes')}
                  className="flex items-center gap-1 px-2 py-1 text-sm bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20"
                >
                  <Plus className="w-3 h-3" /> Hermes
                </button>
                <button
                  onClick={() => spawnAgent('tester')}
                  className="flex items-center gap-1 px-2 py-1 text-sm bg-purple-500/10 text-purple-400 rounded hover:bg-purple-500/20"
                >
                  <Plus className="w-3 h-3" /> Tester
                </button>
              </div>
            </div>

            {agents.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-sm">
                <Bot className="w-8 h-8 mx-auto mb-2" />
                No agents spawned yet
              </div>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusColors[agent.status] || 'bg-slate-500'}`} />
                      <span className="text-sm font-medium text-white">{agent.name}</span>
                      <span className="text-sm text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{agent.type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Play className="w-3 h-3" /> {agent.activeTasks || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> {agent.completedTasks || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> {agent.failedTasks || 0}
                      </span>
                    </div>
                  </div>
                  {agent.capabilities?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {agent.capabilities.map((cap: string, i: number) => (
                        <span key={i} className="text-sm bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-slate-500 uppercase">Task Queue</span>
              {projectId && (
                <button
                  onClick={decomposeProject}
                  className="flex items-center gap-1 px-2 py-1 text-sm bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20"
                >
                  <Layers className="w-3 h-3" /> Decompose
                </button>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-sm">
                <Terminal className="w-8 h-8 mx-auto mb-2" />
                No tasks yet. Decompose a project to create tasks.
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-slate-900/50 border rounded-lg p-3 ${
                    task.status === 'failed' ? 'border-red-500/30' :
                    task.status === 'completed' ? 'border-emerald-500/30' :
                    task.status === 'running' ? 'border-blue-500/30' :
                    'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusColors[task.status] || 'bg-slate-500'}`} />
                      <span className="text-sm font-medium text-white">{task.title}</span>
                      <span className="text-sm text-slate-500">{task.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.attempts > 0 && (
                        <span className="text-sm text-amber-400">
                          {task.attempts}/{task.maxAttempts || 3}
                        </span>
                      )}
                      <span className={`text-sm px-1.5 py-0.5 rounded ${
                        task.priority >= 4 ? 'bg-red-500/10 text-red-400' :
                        task.priority >= 3 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        P{task.priority}
                      </span>
                    </div>
                  </div>
                  {task.description && (
                    <p className="mt-1 text-sm text-slate-500">{task.description}</p>
                  )}
                  {task.errorLog && (
                    <div className="mt-2 p-2 bg-red-950/30 border border-red-900/30 rounded text-sm text-red-400 font-mono overflow-auto max-h-20">
                      {task.errorLog}
                    </div>
                  )}
                  {task.agentId && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                      <Bot className="w-3 h-3" />
                      {agents.find(a => a.id === task.agentId)?.name || task.agentId}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-slate-500 uppercase">Skill Library</span>
              <span className="text-sm text-slate-500">{skills.length} shared skills</span>
            </div>

            {skills.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-sm">
                <BrainCircuit className="w-8 h-8 mx-auto mb-2" />
                No skills yet. Agents create skills as they learn.
              </div>
            ) : (
              skills.map((skill) => (
                <div
                  key={skill.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Puzzle className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-white">{skill.name}</span>
                      <span className="text-sm text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">v{skill.version}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {skill.successRate !== null && (
                        <span className={`${
                          skill.successRate > 0.8 ? 'text-emerald-400' :
                          skill.successRate > 0.5 ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {Math.round(skill.successRate * 100)}% success
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{skill.description}</p>
                  {skill.triggerPatterns?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {skill.triggerPatterns.map((tp: string, i: number) => (
                        <span key={i} className="text-sm bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          {tp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
