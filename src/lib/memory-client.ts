// Kelly's brain — automatically remembers everything important
const MEMORY_API = process.env.MEMORY_SERVER_URL || "http://localhost:3001";

export async function remember(opts: any) {
  try {
    const res = await fetch(`${MEMORY_API}/tools/memory_write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...opts, priority: opts.priority || "warm", tags: opts.tags || [] }),
    });
    return await res.json();
  } catch (err: any) {
    console.warn("[Memory] Save failed:", err.message);
    return { success: false };
  }
}

export async function recall(query: string, projectId?: string) {
  try {
    const res = await fetch(`${MEMORY_API}/tools/memory_search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, projectId }),
    });
    const data = await res.json();
    return data.results || [];
  } catch (err: any) {
    console.warn("[Memory] Recall failed:", err.message);
    return [];
  }
}

export async function getMemoryContext(query: string): Promise<string> {
  try {
    const res = await fetch(`${MEMORY_API}/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (!data.memories?.length) return "";
    return data.memories.map((m: any) => `[${m.type}] ${m.key}: ${m.content}`).join("\n");
  } catch (err: any) {
    console.warn("[Memory] Context failed:", err.message);
    return "";
  }
}

export const memory = {
  preference: (key: string, content: string, tags?: string[]) =>
    remember({ type: "preference", key, content, priority: "hot", tags }),
  decision: (key: string, content: string, projectId?: string, tags?: string[]) =>
    remember({ type: "decision", key, content, projectId, priority: "hot", tags }),
  bugfix: (key: string, content: string, tags?: string[]) =>
    remember({ type: "bugfix", key, content, priority: "hot", tags }),
  pattern: (key: string, content: string, tags?: string[]) =>
    remember({ type: "pattern", key, content, priority: "warm", tags }),
  project: (key: string, content: string, projectId: string, tags?: string[]) =>
    remember({ type: "project", key, content, projectId, priority: "warm", tags }),
  context: getMemoryContext,
  search: recall,
};
