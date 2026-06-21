import express, { Request, Response } from 'express';
import cors from 'cors';
import { MemoryStore, MemoryEntry } from './store.js';

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || '/data/memory.db';

app.use(cors());
app.use(express.json());

const store = new MemoryStore(DB_PATH);

// ─── Health Check ───
app.get('/health', (_req: Request, res: Response) => {
  const stats = store.getStats();
  res.json({
    status: 'ok',
    version: '1.0.0',
    memories: stats,
    uptime: process.uptime()
  });
});

// ─── MCP Tool: memory_write ───
app.post('/tools/memory_write', (req: Request, res: Response) => {
  try {
    const { type, key, content, projectId, userId, priority = 'warm', tags = [] } = req.body;

    if (!type || !key || !content) {
      return res.status(400).json({
        error: 'Missing required fields: type, key, content'
      });
    }

    const entry = store.write({
      type,
      key,
      content,
      projectId,
      userId,
      priority,
      tags: Array.isArray(tags) ? tags : []
    });

    res.json({
      success: true,
      id: entry.id,
      type: entry.type,
      key: entry.key,
      priority: entry.priority
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ─── MCP Tool: memory_search ───
app.post('/tools/memory_search', (req: Request, res: Response) => {
  try {
    const { query, type, projectId, userId, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing required field: query' });
    }

    const results = store.search(query, {
      type,
      projectId,
      userId,
      limit: Math.min(limit, 50)
    });

    res.json({
      success: true,
      query,
      count: results.length,
      results: results.map(r => ({
        id: r.entry.id,
        type: r.entry.type,
        key: r.entry.key,
        content: r.entry.content.substring(0, 500),
        priority: r.entry.priority,
        relevance: Math.round(r.relevance * 100) / 100,
        tags: r.entry.tags
      }))
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ─── MCP Tool: memory_read ───
app.post('/tools/memory_read', (req: Request, res: Response) => {
  try {
    const { id, key } = req.body;

    let entry: MemoryEntry | null = null;
    if (id) {
      entry = store.getById(id);
    }

    if (!entry && key) {
      const results = store.search(key, { limit: 1 });
      entry = results[0]?.entry || null;
    }

    if (!entry) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.json({
      success: true,
      memory: {
        id: entry.id,
        type: entry.type,
        key: entry.key,
        content: entry.content,
        priority: entry.priority,
        tags: entry.tags,
        createdAt: entry.createdAt,
        accessCount: entry.accessCount
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ─── MCP Tool: memory_update_priority ───
app.post('/tools/memory_update_priority', (req: Request, res: Response) => {
  try {
    const { id, priority } = req.body;

    if (!id || !priority || !['hot', 'warm', 'cold'].includes(priority)) {
      return res.status(400).json({
        error: 'Missing required fields: id, priority (hot|warm|cold)'
      });
    }

    const updated = store.updatePriority(id, priority);

    res.json({
      success: updated,
      message: updated ? 'Priority updated' : 'Memory not found'
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ─── MCP Tool: memory_delete ───
app.post('/tools/memory_delete', (req: Request, res: Response) => {
  try {
    const { id, projectId } = req.body;

    if (projectId) {
      const count = store.deleteByProject(projectId);
      return res.json({ success: true, deleted: count });
    }

    if (id) {
      const deleted = store.delete(id);
      return res.json({ success: deleted, message: deleted ? 'Deleted' : 'Not found' });
    }

    return res.status(400).json({ error: 'Missing id or projectId' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ─── MCP Tool: memory_status ───
app.post('/tools/memory_status', (_req: Request, res: Response) => {
  try {
    const stats = store.getStats();
    res.json({
      success: true,
      status: {
        total: stats.total,
        hot: stats.hot,
        warm: stats.warm,
        cold: stats.cold,
        efficiency: stats.total > 0 ? Math.round((stats.hot / stats.total) * 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ─── MCP Tool: memory_consolidate ───
app.post('/tools/memory_consolidate', (_req: Request, res: Response) => {
  try {
    const result = store.consolidate();
    res.json({
      success: true,
      consolidated: result
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ─── Context Injection Endpoint ───
// Returns hot memories formatted for LLM context injection
app.post('/context', (req: Request, res: Response) => {
  try {
    const { projectId, userId, maxTokens = 180 } = req.body;

    const memories = store.getHotContext(projectId, userId, maxTokens);

    let contextText = '';
    if (memories.length > 0) {
      contextText = '=== RELEVANT MEMORIES ===\n\n';
      for (const mem of memories) {
        contextText += `[${mem.type.toUpperCase()}] ${mem.key}:\n${mem.content}\n\n`;
      }
      contextText += '=== END MEMORIES ===\n';
    }

    // Log context injection
    const logId = crypto.randomUUID();
    res.json({
      success: true,
      contextId: logId,
      memoryCount: memories.length,
      tokenEstimate: Math.ceil(contextText.length * 0.25),
      context: contextText,
      memories: memories.map(m => ({
        id: m.id,
        type: m.type,
        key: m.key,
        priority: m.priority
      }))
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ─── MCP Manifest ───
app.get('/mcp/manifest', (_req: Request, res: Response) => {
  res.json({
    name: 'buildany-memory',
    version: '1.0.0',
    description: 'Persistent memory for BuildAny AI agents',
    tools: [
      {
        name: 'memory_write',
        description: 'Write a new memory entry',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['fact', 'preference', 'decision', 'pattern', 'bugfix', 'project'] },
            key: { type: 'string', description: 'Unique key for this memory' },
            content: { type: 'string', description: 'The memory content' },
            projectId: { type: 'string', optional: true },
            userId: { type: 'string', optional: true },
            priority: { type: 'string', enum: ['hot', 'warm', 'cold'], default: 'warm' },
            tags: { type: 'array', items: { type: 'string' }, default: [] }
          },
          required: ['type', 'key', 'content']
        }
      },
      {
        name: 'memory_search',
        description: 'Search memories by query',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            type: { type: 'string', optional: true },
            projectId: { type: 'string', optional: true },
            limit: { type: 'number', default: 10 }
          },
          required: ['query']
        }
      },
      {
        name: 'memory_read',
        description: 'Read a specific memory by ID or key',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', optional: true },
            key: { type: 'string', optional: true }
          }
        }
      },
      {
        name: 'memory_update_priority',
        description: 'Change memory priority (hot/warm/cold)',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            priority: { type: 'string', enum: ['hot', 'warm', 'cold'] }
          },
          required: ['id', 'priority']
        }
      },
      {
        name: 'memory_delete',
        description: 'Delete a memory or all memories for a project',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', optional: true },
            projectId: { type: 'string', optional: true }
          }
        }
      },
      {
        name: 'memory_status',
        description: 'Get memory store statistics',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'memory_consolidate',
        description: 'Merge duplicates and clean old memories',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    ]
  });
});

// ─── Start Server ───
app.listen(PORT, () => {
  console.log(`[Kelly Memory] MCP server running on port ${PORT}`);
  console.log(`[Kelly Memory] Database: ${DB_PATH}`);
  console.log(`[Kelly Memory] Endpoints:`);
  console.log(`  - POST /tools/memory_write`);
  console.log(`  - POST /tools/memory_search`);
  console.log(`  - POST /tools/memory_read`);
  console.log(`  - POST /tools/memory_update_priority`);
  console.log(`  - POST /tools/memory_delete`);
  console.log(`  - POST /tools/memory_status`);
  console.log(`  - POST /tools/memory_consolidate`);
  console.log(`  - POST /context (for LLM context injection)`);
  console.log(`  - GET /health`);
  console.log(`  - GET /mcp/manifest`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Kelly Memory] Shutting down...');
  store.close();
  process.exit(0);
});
