// src/lib/memory-client.ts
// Kelly's brain — automatically remembers everything important

const MEMORY_API = process.env.MEMORY_SERVER_URL || "http://localhost:3001";

interface MemoryOptions {
  type: "fact" | "preference" | "decision" | "pattern" | "bugfix" | "project";
  key: string;
  content: string;
  projectId?: string;
  priority?: "hot" | "warm" | "cold";
  tags?: string[];
}

/**
 * Save a memory for Kelly to remember
 */
export async function remember(opts: MemoryOptions): Promise<{ success: boolean; id?: string }> {
  try {
    const res = await fetch(`${MEMORY_API}/tools/memory_write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: opts.type,
        key: opts.key,
        content: opts.content,
        projectId: opts.projectId,
        priority: opts.priority || "warm",
        tags: opts.tags || [],
      }),
    });
    const data = await res.json();
    return { success: data.success, id: data.id };
  } catch (err: any) {
    console.warn("[Memory] Failed to save:", err.message);
    return { success: false };
  }
}

/**
 * Search memories by query
 */
export async function recall(query: string, projectId?: string): Promise<any[]> {
  try {
    const res = await fetch(`${MEMORY_API}/tools/memory_search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, projectId }),
    });
    const data = await res.json();
    return data.results || [];
  } catch (err: any) {
    console.warn("[Memory] Failed to recall:", err.message);
    return [];
  }
}

/**
 * Get hot memories as context for LLM prompts
 */
export async function getMemoryContext(query: string): Promise<string> {
  try {
    const res = await fetch(`${MEMORY_API}/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (!data.memories || data.memories.length === 0) return "";
    
    return data.memories.map((m: any) => `[${m.type}] ${m.key}: ${m.content}`).join("\n");
  } catch (err: any) {
    console.warn("[Memory] Failed to get context:", err.message);
    return "";
  }
}

/**
 * Quick helpers for common memory types
 */
export const memory = {
  /** Remember a user preference */
  preference: (key: string, content: string, tags?: string[]) =>
    remember({ type: "preference", key, content, priority: "hot", tags }),

  /** Remember a design/decision */
  decision: (key: string, content: string, projectId?: string, tags?: string[]) =>
    remember({ type: "decision", key, content, projectId, priority: "hot", tags }),

  /** Remember a bug and its fix */
  bugfix: (key: string, content: string, tags?: string[]) =>
    remember({ type: "bugfix", key, content, priority: "hot", tags }),

  /** Remember a reusable pattern */
  pattern: (key: string, content: string, tags?: string[]) =>
    remember({ type: "pattern", key, content, priority: "warm", tags }),

  /** Remember project-specific info */
  project: (key: string, content: string, projectId: string, tags?: string[]) =>
    remember({ type: "project", key, content, projectId, priority: "warm", tags }),

  /** Get context string for LLM prompts */
  context: getMemoryContext,

  /** Search all memories */
  search: recall,
};
