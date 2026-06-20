/**
 * Memory Client for BuildAny
 * 
 * Simple fetch-based client to interact with the memory server.
 * Auto-discovers port from port file if server used a fallback.
 */

import { readFileSync } from "fs";
import { join } from "path";

function getServerUrl(): string {
  // Check env var first
  if (process.env.MEMORY_SERVER_URL) return process.env.MEMORY_SERVER_URL;
  
  // Check port file (written by server when it uses fallback port)
  try {
    const portFile = join(process.cwd(), "data", ".memory-port");
    const port = readFileSync(portFile, "utf-8").trim();
    return `http://localhost:${port}`;
  } catch {
    // Default port
    return "http://localhost:3001";
  }
}

const MEMORY_SERVER_URL = getServerUrl();

export interface MemoryEntry {
  id: string;
  content: string;
  category: string;
  importance: number;
  access_count: number;
  created_at: number;
  project_id?: string;
  tags?: string;
}

export async function memoryWrite(
  content: string,
  category: string = "general",
  importance: number = 50,
  projectId?: string,
  tags?: string[]
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch(`${MEMORY_SERVER_URL}/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, category, importance, project_id: projectId, tags }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function memoryRead(
  id?: string,
  projectId?: string
): Promise<{ success: boolean; memory?: MemoryEntry; memories?: MemoryEntry[]; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (id) params.append("id", id);
    if (projectId) params.append("project_id", projectId);
    const res = await fetch(`${MEMORY_SERVER_URL}/read?${params}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function memorySearch(
  query: string,
  projectId?: string,
  limit: number = 10
): Promise<{ success: boolean; results?: MemoryEntry[]; error?: string }> {
  try {
    const res = await fetch(`${MEMORY_SERVER_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, project_id: projectId, limit }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function memoryDelete(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${MEMORY_SERVER_URL}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function memoryStatus(): Promise<{ success: boolean; total?: number; hot?: number; archived?: number; error?: string }> {
  try {
    const res = await fetch(`${MEMORY_SERVER_URL}/status`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function memoryConsolidate(
  projectId?: string,
  minImportance: number = 30,
  maxAge: number = 90
): Promise<{ success: boolean; archived?: number; error?: string }> {
  try {
    const res = await fetch(`${MEMORY_SERVER_URL}/consolidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, minImportance, maxAge }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
