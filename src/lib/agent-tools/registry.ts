/**
 * Agent Tool Registry
 * Self-improving agent system — Jason can generate, register, and use tools dynamically
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const TOOLS_DIR = join(process.cwd(), "src/lib/agent-tools/generated");
const REGISTRY_FILE = join(TOOLS_DIR, ".registry.json");

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  code: string;
  createdAt: string;
  useCount: number;
  lastUsed?: string;
}

interface Registry {
  tools: AgentTool[];
  version: number;
}

// Ensure directories exist
try {
  mkdirSync(TOOLS_DIR, { recursive: true });
} catch {}

function loadRegistry(): Registry {
  if (!existsSync(REGISTRY_FILE)) {
    return { tools: [], version: 1 };
  }
  try {
    return JSON.parse(readFileSync(REGISTRY_FILE, "utf-8"));
  } catch {
    return { tools: [], version: 1 };
  }
}

function saveRegistry(registry: Registry) {
  writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

export function listTools(): AgentTool[] {
  return loadRegistry().tools;
}

export function getTool(name: string): AgentTool | undefined {
  return loadRegistry().tools.find((t) => t.name === name);
}

export function toolExists(name: string): boolean {
  return loadRegistry().tools.some((t) => t.name === name);
}

export function registerTool(tool: Omit<AgentTool, "id" | "createdAt" | "useCount">): AgentTool {
  const registry = loadRegistry();
  
  // Check for duplicate
  const existing = registry.tools.find((t) => t.name === tool.name);
  if (existing) {
    throw new Error(`Tool "${tool.name}" already exists`);
  }

  const fullTool: AgentTool = {
    ...tool,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    useCount: 0,
  };

  registry.tools.push(fullTool);
  saveRegistry(registry);

  // Save code to file for persistence
  const toolFile = join(TOOLS_DIR, `${tool.name}.ts`);
  writeFileSync(toolFile, tool.code);

  console.log(`[AgentTools] Registered new tool: ${tool.name}`);
  return fullTool;
}

export function updateTool(name: string, updates: Partial<AgentTool>): AgentTool | null {
  const registry = loadRegistry();
  const idx = registry.tools.findIndex((t) => t.name === name);
  if (idx === -1) return null;

  registry.tools[idx] = { ...registry.tools[idx], ...updates };
  saveRegistry(registry);

  // Update code file if provided
  if (updates.code) {
    const toolFile = join(TOOLS_DIR, `${name}.ts`);
    writeFileSync(toolFile, updates.code);
  }

  return registry.tools[idx];
}

export function incrementUseCount(name: string) {
  const registry = loadRegistry();
  const tool = registry.tools.find((t) => t.name === name);
  if (tool) {
    tool.useCount++;
    tool.lastUsed = new Date().toISOString();
    saveRegistry(registry);
  }
}

export function deleteTool(name: string): boolean {
  const registry = loadRegistry();
  const idx = registry.tools.findIndex((t) => t.name === name);
  if (idx === -1) return false;

  registry.tools.splice(idx, 1);
  saveRegistry(registry);

  // Delete code file
  const toolFile = join(TOOLS_DIR, `${name}.ts`);
  if (existsSync(toolFile)) {
    unlinkSync(toolFile);
  }

  return true;
}
