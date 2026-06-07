import { useState, useEffect } from 'react';
import { 
  Bot, Play, Square, Cpu, GitBranch, Zap, Layers, 
  CheckCircle, XCircle, RotateCcw, ArrowRight, Plus,
  Terminal, Sparkles, BrainCircuit, Puzzle, Code2, Trash2
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

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const loadData = async () => {
    try {
      // Fetch agents from DB first, then Hermes as fallback
      let agentsList: any[] = [];
      
      if (projectId) {
        // Try to fetch agents from project API
        const projectAgentsRes = await fetch(`/api/project/${projectId}/agents`).catch(() => null);
        if (projectAgentsRes && projectAgentsRes.ok) {
          const projectAgentsData = await projectAgentsRes.json();
          agentsList = projectAgentsData.agents || [];
        }
      }
      
      // Fallback to Hermes API
      if (agentsList.length === 0) {
        const agentsRes = await fetch('/api/hermes');
        const agentsData = await agentsRes.json();
        agentsList = agentsData.agents || [];
      }
      
      // Fetch tasks from project API (which reads from DB)
      const tasksRes = projectId 
        ? await fetch(`/api/project/${projectId}/tasks`) 
        : null;
      
      // Also try decompose API as fallback
      const decomposeRes = projectId 
        ? await fetch(`/api/decompose?projectId=${projectId}`).catch(() => null)
        : null;
      
      const skillsRes = await fetch('/api/skills?shared=true');

      const tasksData = tasksRes && tasksRes.ok ? await tasksRes.json() : { tasks: [] };
      const decomposeData = decomposeRes && decomposeRes.ok ? await decomposeRes.json() : { tasks: [] };
      const skillsData = await skillsRes.json();

      // Merge tasks from both sources (decompose for plan, DB for status)
      const dbTasks = tasksData.tasks || [];
      const planTasks = decomposeData.tasks || [];
      
      // If we have DB tasks, use them; otherwise use plan tasks
      const mergedTasks = dbTasks.length > 0 ? dbTasks : planTasks;
      
      // Create default agents if none exist but tasks do
      let agents: any[] = agentsList;
      if (agents.length === 0 && mergedTasks.length > 0) {
        // Create default agents based on task types
        const taskTypes = [...new Set(mergedTasks.map((t: any) => t.type || 'code'))] as string[];
        agents = taskTypes.map((type: string, i: number) => ({
          id: `agent-${type}-${i}`,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
          type: type,
          status: 'ready',
          capabilities: [type, 'build', 'test'],
          activeTasks: mergedTasks.filter((t: any) => t.status === 'running' && t.type === type).length,
          completedTasks: mergedTasks.filter((t: any) => t.status === 'completed' && t.type === type).length,
          failedTasks: mergedTasks.filter((t: any) => t.status === 'failed' && t.type === type).length,
        }));
      }
      
      // Assign agents to tasks for display
      const tasksWithAgents = mergedTasks.map((task: any, index: number) => {
        if (!task.agentId && agents.length > 0) {
          // Assign agent based on task type or round-robin
          const matchingAgent = agents.find((a: any) => a.type === task.type || a.capabilities?.includes(task.type));
          const assignedAgent = matchingAgent || agents[index % agents.length];
          return { ...task, agentId: assignedAgent.id, agentName: assignedAgent.name };
        }
        return task;
      });

      setAgents(agents);
      setTasks(tasksWithAgents);
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
      <div className="h-full flex items-center justify-center text-gray-500">
        <Cpu className="w-6 h-6 animate-spin mr-2" />
        Loading swarm state...
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    idle: 'bg-emerald-500',
    busy: 'bg-amber-500',
    offline: 'bg-gray-500',
    pending: 'bg-gray-600',
    ready: 'bg-cyan-500',
    running: 'bg-blue-500',
    completed: 'bg-emerald-500',
    failed: 'bg-red-500',
    retrying: 'bg-amber-500',
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-600" />
          <span className="text-base font-medium text-gray-900">Agent Swarm</span>
          <span className="text-sm bg-cyan-50 text-cyan-600 px-2 py-0.5 rounded-full">
            {agents.length} agents &bull; {tasks.length} tasks
          </span>
        </div>
        <div className="flex gap-1">
          {(['agents', 'tasks', 'skills'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-sm rounded transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-cyan-50 text-cyan-600 border border-cyan-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500 uppercase font-medium">Active Agents</span>
              <div className="flex gap-2">
                <button
                  onClick={() => spawnAgent('hermes')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-cyan-50 text-cyan-600 rounded border border-cyan-200 hover:bg-cyan-100"
                >
                  <Plus className="w-4 h-4" /> Hermes
                </button>
                <button
                  onClick={() => spawnAgent('tester')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded border border-purple-200 hover:bg-purple-100"
                >
                  <Plus className="w-4 h-4" /> Tester
                </button>
              </div>
            </div>

            {agents.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Bot className="w-8 h-8 mx-auto mb-2" />
                No agents spawned yet
              </div>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                >
                  {/* Row 1: Name, Status, Type */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-3 h-3 rounded-full ${statusColors[agent.status] || 'bg-gray-500'}`} 
                        title={`Status: ${agent.status}`}
                      />
                      <span className="text-base font-semibold text-gray-900">{agent.name}</span>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{agent.type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1" title="Active tasks">
                        <Play className="w-4 h-4 text-blue-500" /> <span className="text-gray-700 font-medium">{agent.activeTasks || 0}</span>
                      </span>
                      <span className="flex items-center gap-1" title="Completed tasks">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> <span className="text-gray-700 font-medium">{agent.completedTasks || 0}</span>
                      </span>
                      <span className="flex items-center gap-1" title="Failed tasks">
                        <XCircle className="w-4 h-4 text-red-500" /> <span className="text-gray-700 font-medium">{agent.failedTasks || 0}</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Row 2: Capabilities */}
                  {agent.capabilities?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {agent.capabilities.map((cap: string, i: number) => (
                        <span key={i} className="text-sm bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-1 rounded flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Row 3: Explanation */}
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="text-gray-700 font-medium">Status:</span> {agent.status} &bull; 
                    <span className="text-gray-700 font-medium"> Tasks:</span> {agent.activeTasks || 0} active, {agent.completedTasks || 0} done, {agent.failedTasks || 0} failed
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500 uppercase font-medium">Task Queue</span>
              {projectId && (
                <button
                  onClick={decomposeProject}
                  className="flex items-center gap-1 px-2 py-1 text-sm bg-cyan-50 text-cyan-600 rounded border border-cyan-200 hover:bg-cyan-100"
                >
                  <Layers className="w-3 h-3" /> Decompose
                </button>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Terminal className="w-8 h-8 mx-auto mb-2" />
                No tasks yet. Decompose a project to create tasks.
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-white border rounded-lg p-3 shadow-sm ${
                    task.status === 'failed' ? 'border-red-200' :
                    task.status === 'completed' ? 'border-emerald-200' :
                    task.status === 'running' ? 'border-blue-200' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusColors[task.status] || 'bg-gray-500'}`} />
                      <span className="text-sm font-medium text-gray-900">{task.title}</span>
                      <span className="text-sm text-gray-500">{task.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.attempts > 0 && (
                        <span className="text-sm text-amber-600">
                          {task.attempts}/{task.maxAttempts || 3}
                        </span>
                      )}
                      <span className={`text-sm px-1.5 py-0.5 rounded ${
                        task.priority >= 4 ? 'bg-red-50 text-red-600 border border-red-200' :
                        task.priority >= 3 ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        P{task.priority}
                      </span>
                    </div>
                  </div>
                  {task.description && (
                    <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                  )}
                  {task.errorLog && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600 font-mono overflow-auto max-h-20">
                      {task.errorLog}
                    </div>
                  )}
                  {task.agentId && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                      <Bot className="w-3 h-3" />
                      {agents.find(a => a.id === task.agentId)?.name || task.agentName || task.agentId}
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
              <span className="text-sm text-gray-500 uppercase font-medium">Skill Library</span>
              <span className="text-sm text-gray-500">{skills.length} shared skills</span>
            </div>

            {skills.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <BrainCircuit className="w-8 h-8 mx-auto mb-2" />
                No skills yet. Agents create skills as they learn.
              </div>
            ) : (
              skills.map((skill) => (
                <div
                  key={skill.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Puzzle className="w-4 h-4 text-cyan-600" />
                      <span className="text-sm font-medium text-gray-900">{skill.name}</span>
                      <span className="text-sm text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">v{skill.version}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {skill.successRate !== null && (
                        <span className={`${
                          skill.successRate > 0.8 ? 'text-emerald-600' :
                          skill.successRate > 0.5 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {Math.round(skill.successRate * 100)}% success
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{skill.description}</p>
                  {skill.triggerPatterns?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {skill.triggerPatterns.map((tp: string, i: number) => (
                        <span key={i} className="text-sm bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
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
