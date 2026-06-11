import { useState, useEffect, useCallback } from 'react';
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

  // Define loadData BEFORE useEffect calls it
  const loadData = useCallback(async () => {
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
      let tasksWithAgents = mergedTasks;
      
      if (agents.length === 0 && mergedTasks.length > 0) {
        // Create default agents based on task types
        const taskTypes = [...new Set(mergedTasks.map((t: any) => t.type || 'code'))] as string[];
        agents = taskTypes.map((type: string, i: number) => ({
          id: `agent-${type}-${i}`,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
          type: type,
          status: 'ready',
          capabilities: [type, 'build', 'test'],
          activeTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
        }));
        
        // Assign tasks to fake agents by type and recompute counts
        tasksWithAgents = mergedTasks.map((task: any) => {
          const matchingAgent = agents.find((a: any) => a.type === task.type || a.capabilities?.includes(task.type));
          const assignedAgent = matchingAgent || agents[0];
          return { ...task, agentId: assignedAgent.id, agentName: assignedAgent.name };
        });
      } else {
        // Assign agents to tasks for display (for real agents too)
        tasksWithAgents = mergedTasks.map((task: any, index: number) => {
          if (!task.agentId && agents.length > 0) {
            const matchingAgent = agents.find((a: any) => a.type === task.type || a.capabilities?.includes(task.type));
            const assignedAgent = matchingAgent || agents[index % agents.length];
            return { ...task, agentId: assignedAgent.id, agentName: assignedAgent.name };
          }
          return task;
        });
      }

      // Recompute agent counts from assigned tasks (covers both fallback and real agents)
      const activeStatuses = ['running', 'pending', 'ready', 'working', 'in_progress'];
      const completedStatuses = ['completed', 'done', 'success'];
      const failedStatuses = ['failed', 'error'];
      
      agents = agents.map((agent: any) => {
        const agentTasks = tasksWithAgents.filter((t: any) => t.agentId === agent.id);
        const activeCount = agentTasks.filter((t: any) => activeStatuses.includes(t.status)).length;
        const completedCount = agentTasks.filter((t: any) => completedStatuses.includes(t.status)).length;
        const failedCount = agentTasks.filter((t: any) => failedStatuses.includes(t.status)).length;
        
        // FIX: If no active tasks, agent should be idle/ready, not working
        const hasActiveTasks = activeCount > 0;
        
        return {
          ...agent,
          activeTasks: activeCount,
          completedTasks: completedCount,
          failedTasks: failedCount,
          status: hasActiveTasks ? 'working' : (completedCount > 0 ? 'ready' : (agent.status || 'ready')),
        };
      });

      setAgents(agents);
      setTasks(tasksWithAgents);
      setSkills(skillsData.skills || []);
    } catch (err) {
      console.error('Swarm data error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

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
      if (data.success) loadData();
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

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'agents' 
              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Bot className="w-4 h-4" />
            Agents
            {agents.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs">
                {agents.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'tasks' 
              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            Tasks
            {tasks.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs">
                {tasks.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'skills' 
              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Skills
            {skills.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs">
                {skills.length}
              </span>
            )}
          </div>
        </button>
        
        <div className="flex-1" />
        
        <button
          onClick={() => spawnAgent('hermes')}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Hermes
        </button>
        <button
          onClick={() => spawnAgent('tester')}
          className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Tester
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'agents' && (
          <div className="space-y-3">
            {agents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No active agents</p>
                <p className="text-sm mt-1">Create a project to spawn agents</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          agent.status === 'working' ? 'bg-green-500 animate-pulse' :
                          agent.status === 'idle' ? 'bg-gray-400' :
                          agent.status === 'ready' ? 'bg-blue-500' :
                          'bg-yellow-500'
                        }`} />
                        <div>
                          <h3 className="font-medium text-gray-900">{agent.name}</h3>
                          <p className="text-xs text-gray-500">{agent.type}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        agent.status === 'working' ? 'bg-green-100 text-green-700' :
                        agent.status === 'idle' ? 'bg-gray-100 text-gray-600' :
                        agent.status === 'ready' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm mb-3">
                      <div className="flex items-center gap-1 text-blue-600">
                        <Play className="w-3.5 h-3.5" />
                        <span>{agent.activeTasks || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{agent.completedTasks || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{agent.failedTasks || 0}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {(agent.capabilities || []).map((cap: string) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No tasks yet</p>
                <p className="text-sm mt-1">Decompose a project to create tasks</p>
                <button
                  onClick={decomposeProject}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Decompose Project
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          task.status === 'running' ? 'bg-green-500 animate-pulse' :
                          task.status === 'pending' ? 'bg-gray-400' :
                          task.status === 'completed' ? 'bg-blue-500' :
                          task.status === 'failed' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`} />
                        <div>
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          <p className="text-sm text-gray-500">{task.type} • {task.status}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        task.status === 'running' ? 'bg-green-100 text-green-700' :
                        task.status === 'pending' ? 'bg-gray-100 text-gray-600' :
                        task.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        task.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{task.description}</p>
                    {task.agentName && (
                      <p className="text-xs text-gray-400 mt-2">Assigned to: {task.agentName}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-3">
            {skills.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No skills shared</p>
                <p className="text-sm mt-1">Agents will share skills as they complete tasks</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {skills.map((skill: any) => (
                  <div
                    key={skill.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Puzzle className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{skill.name}</h3>
                        <p className="text-sm text-gray-500">{skill.capability}</p>
                        <p className="text-xs text-gray-400 mt-1">Shared by {skill.agentName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
