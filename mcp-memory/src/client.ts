/**
 * Kelly Memory Client
 * Connects BuildAny to the MCP Memory Server
 */

const MEMORY_SERVER_URL = process.env.MEMORY_SERVER_URL || 'http://localhost:3001';

interface MemoryWriteInput {
  type: 'fact' | 'preference' | 'decision' | 'pattern' | 'bugfix' | 'project';
  key: string;
  content: string;
  projectId?: string;
  userId?: string;
  priority?: 'hot' | 'warm' | 'cold';
  tags?: string[];
}

interface MemorySearchInput {
  query: string;
  type?: string;
  projectId?: string;
  userId?: string;
  limit?: number;
}

interface ContextInput {
  projectId?: string;
  userId?: string;
  maxTokens?: number;
}

export class KellyMemoryClient {
  private baseUrl: string;

  constructor(baseUrl: string = MEMORY_SERVER_URL) {
    this.baseUrl = baseUrl;
  }

  async write(input: MemoryWriteInput): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/memory_write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async search(input: MemorySearchInput): Promise<{ success: boolean; results?: any[]; count?: number; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/memory_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getContext(input: ContextInput): Promise<{ success: boolean; context?: string; memoryCount?: number; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async status(): Promise<{ success: boolean; status?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/memory_status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async health(): Promise<{ status: string; memories?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'down', memories: null };
    }
  }
}

// Singleton instance
export const kellyMemory = new KellyMemoryClient();
