"use client";

import { useState, useEffect } from "react";
import { Brain, Bot, Wrench, CheckCircle, AlertTriangle, Loader2, Zap, Shield, BookOpen, Code2 } from "lucide-react";

interface AgentsTasksPanelProps {
  projectId: string;
}

interface AgentTask {
  id: string;
  agent: "kelly" | "morgan" | "buildany";
  title: string;
  description: string;
  status: "idle" | "running" | "completed" | "failed";
  skill?: string;
  createdAt: Date;
}

export function AgentsTasksPanel({ projectId }: AgentsTasksPanelProps) {
  const [tasks, setTasks] = useState<AgentTask[]>([
    {
      id: "welcome",
      agent: "kelly",
      title: "Welcome to Agents/Tasks",
      description: "Kelly and Morgan are your AI team. Kelly plans and reviews, Morgan executes and fixes. Assign tasks below!",
      status: "completed",
      skill: "planning-and-task-breakdown",
      createdAt: new Date(),
    },
  ]);
  const [activeAgent, setActiveAgent] = useState<"kelly" | "morgan">("kelly");
  const [newTask, setNewTask] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const agentConfig = {
    kelly: {
      name: "Kelly",
      role: "The Brain",
      description: "Planning, research, architecture, code review, task breakdown",
      icon: Brain,
      color: "purple",
      skills: [
        "planning-and-task-breakdown",
        "code-review-and-quality",
        "systematic-debugging",
        "spec-driven-development",
        "ponytail-review",
      ],
    },
    morgan: {
      name: "Morgan",
      role: "The Executor",
      description: "Security audits, bulk fixes, refactoring, automated testing",
      icon: Bot,
      color: "blue",
      skills: [
        "security-and-hardening",
        "performance-optimization",
        "test-driven-development",
        "ponytail-audit",
      ],
    },
  };

  const handleSubmit = async () => {
    if (!newTask.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const taskId = crypto.randomUUID();

    const task: AgentTask = {
      id: taskId,
      agent: activeAgent,
      title: newTask.slice(0, 60),
      description: newTask,
      status: "running",
      skill: activeAgent === "kelly" ? "planning-and-task-breakdown" : "security-and-hardening",
      createdAt: new Date(),
    };

    setTasks((prev) => [task, ...prev]);
    setNewTask("");

    try {
      // Send to orchestrator API
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: newTask,
          projectId,
          action: "execute",
        }),
      });

      const data = await res.json();

      // Update task with result
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: data.success ? "completed" : "failed",
                description: data.reasoning || t.description,
              }
            : t
        )
      );
    } catch (error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "failed" } : t
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAgentColor = (agent: string) => {
    return agent === "kelly"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : "bg-blue-50 text-blue-700 border-blue-200";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      default:
        return <Zap className="w-4 h-4 text-gray-400" />;
    }
  };

  const config = agentConfig[activeAgent];
  const Icon = config.icon;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-600" />
          Agents / Tasks
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Assign tasks to Kelly (Brain) or Morgan (Executor)
        </p>
      </div>

      {/* Agent Selector */}
      <div className="flex gap-2 p-4 border-b border-gray-200">
        {(Object.keys(agentConfig) as Array<keyof typeof agentConfig>).map((key) => {
          const agent = agentConfig[key];
          const AgentIcon = agent.icon;
          return (
            <button
              key={key}
              onClick={() => setActiveAgent(key)}
              className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeAgent === key
                  ? key === "kelly"
                    ? "bg-purple-50 border-purple-300 text-purple-700"
                    : "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <AgentIcon className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm font-medium">{agent.name}</div>
                <div className="text-xs opacity-70">{agent.role}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Agent Info + Skills */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium text-gray-700">
            {config.name} — {config.description}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {config.skills.map((skill) => (
            <span
              key={skill}
              className={`px-2 py-0.5 text-[10px] rounded-full border ${
                activeAgent === "kelly"
                  ? "bg-purple-50 text-purple-600 border-purple-200"
                  : "bg-blue-50 text-blue-600 border-blue-200"
              }`}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Task Input */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder={`Ask ${config.name} to... (e.g., "Review code for security issues")`}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-300"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={isSubmitting}
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !newTask.trim()}
            className={`px-4 py-2 text-sm rounded-lg text-white transition-opacity disabled:opacity-50 ${
              activeAgent === "kelly"
                ? "bg-gradient-to-r from-purple-500 to-pink-500"
                : "bg-gradient-to-r from-blue-500 to-cyan-500"
            }`}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto p-4">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Bot className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No tasks yet. Assign one above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border ${getAgentColor(task.agent)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span className="text-sm font-medium truncate">
                        {task.title}
                      </span>
                    </div>
                    <p className="text-xs mt-1 opacity-80">{task.description}</p>
                    {task.skill && (
                      <div className="flex items-center gap-1 mt-2">
                        <Wrench className="w-3 h-3 opacity-60" />
                        <span className="text-[10px] opacity-60">{task.skill}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] opacity-50">
                    {task.agent === "kelly" ? (
                      <Brain className="w-3 h-3" />
                    ) : (
                      <Bot className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
