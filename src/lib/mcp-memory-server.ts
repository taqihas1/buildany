/**
 * MCP Memory Server for BuildAny / Kelly
 * 
 * Implements Model Context Protocol (MCP) with SQLite backend.
 * Provides persistent, searchable memory for AI agents.
 * 
 * Features:
 * - memory_write: Store facts with metadata and importance scoring
 * - memory_search: Semantic + keyword search across memories
 * - memory_read: Retrieve specific memories by ID or category
 * - memory_delete: Remove outdated memories
 * - memory_status: Show hot/cold memory stats
 * - memory_consolidate: Merge related memories, prune low-importance ones
 * 
 * Hot/Cold Tier:
 * - Hot: High-importance + recent memories (injected into context)
 * - Cold: Archived memories (searchable on demand)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import Database from "better-sqlite3";
import { join } from "path";

const MEMORY_DB_PATH = process.env.MEMORY_DB_PATH || join(process.cwd(), "data", "memory.db");

// ─── Database Setup ───

const db = new Database(MEMORY_DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    importance INTEGER DEFAULT 50,
    access_count INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    last_accessed INTEGER DEFAULT (unixepoch()),
    project_id TEXT,
    tags TEXT,
    is_archived INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
  CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_id);
  CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
  CREATE INDEX IF NOT EXISTS idx_memories_search ON memories(content);
  CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(content, tags, content=memories, content_rowid=id);
`);

// ─── Helper Functions ───

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function getHotMemories(limit = 10): any[] {
  const oneWeekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
  return db
    .prepare(
      `SELECT * FROM memories 
       WHERE is_archived = 0 
         AND (importance >= 70 OR created_at > ? OR access_count > 2)
       ORDER BY importance DESC, last_accessed DESC
       LIMIT ?`
    )
    .all(oneWeekAgo, limit);
}

function searchMemories(query: string, limit = 10): any[] {
  // Try FTS first, then fallback to LIKE
  try {
    const ftsResults = db
      .prepare(
        `SELECT m.*, rank 
         FROM memories m
         JOIN memories_fts fts ON m.id = fts.rowid
         WHERE memories_fts MATCH ? AND m.is_archived = 0
         ORDER BY rank
         LIMIT ?`
      )
      .all(query, limit);
    if (ftsResults.length > 0) return ftsResults;
  } catch {
    // FTS might fail on some queries
  }

  // Fallback to LIKE search
  return db
    .prepare(
      `SELECT * FROM memories 
       WHERE is_archived = 0 
         AND (content LIKE ? OR tags LIKE ?)
       ORDER BY importance DESC, last_accessed DESC
       LIMIT ?`
    )
    .all(`%${query}%`, `%${query}%`, limit);
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}

// ─── MCP Server ───

const server = new Server(
  {
    name: "kelly-memory-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "memory_write",
        description: "Store a new memory/fact. Use for user preferences, project decisions, important context.",
        inputSchema: {
          type: "object",
          properties: {
            content: { type: "string", description: "The memory content to store" },
            category: { type: "string", enum: ["user", "project", "tech", "design", "decision", "general"], default: "general" },
            importance: { type: "number", minimum: 1, maximum: 100, default: 50, description: "1-100, higher = more important" },
            projectId: { type: "string", description: "Optional project ID to scope this memory" },
            tags: { type: "string", description: "Comma-separated tags for searchability" },
          },
          required: ["content"],
        },
      },
      {
        name: "memory_search",
        description: "Search memories by keyword or semantic query. Returns most relevant results.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query (keywords, phrases)" },
            limit: { type: "number", default: 10, description: "Max results to return" },
            projectId: { type: "string", description: "Filter by project ID" },
            category: { type: "string", description: "Filter by category" },
          },
          required: ["query"],
        },
      },
      {
        name: "memory_read",
        description: "Read hot memories (high importance/recent) for context injection. Use before generating responses.",
        inputSchema: {
          type: "object",
          properties: {
            maxTokens: { type: "number", default: 180, description: "Target token limit for hot memories" },
            projectId: { type: "string", description: "Filter by project ID" },
          },
        },
      },
      {
        name: "memory_delete",
        description: "Delete a memory by ID or delete outdated memories matching criteria.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "Specific memory ID to delete" },
            olderThan: { type: "number", description: "Delete memories older than N days" },
            category: { type: "string", description: "Delete all memories in category" },
          },
        },
      },
      {
        name: "memory_status",
        description: "Get memory statistics: hot vs cold, total count, token usage.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "memory_consolidate",
        description: "Consolidate memories: merge duplicates, archive old low-importance memories. Call periodically.",
        inputSchema: {
          type: "object",
          properties: {
            archiveThreshold: { type: "number", default: 30, description: "Archive memories with importance below this (unless recently accessed)" },
            mergeSimilar: { type: "boolean", default: true, description: "Attempt to merge similar memories" },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "memory_write": {
      const id = generateId();
      const content = String((args || {}).content || "");
      const category = String((args || {}).category || "general");
      const importance = Math.min(100, Math.max(1, Number((args || {}).importance || 50)));
      const projectId = (args || {}).projectId ? String((args || {}).projectId) : null;
      const tags = (args || {}).tags ? String((args || {}).tags) : null;

      db.prepare(
        `INSERT INTO memories (id, content, category, importance, project_id, tags)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, content, category, importance, projectId, tags);

      return {
        content: [
          { type: "text", text: `Memory stored with ID: ${id}\nTokens: ~${estimateTokens(content)}\nImportance: ${importance}/100` },
        ],
      };
    }

    case "memory_search": {
      const query = String((args || {}).query || "");
      const limit = Math.min(50, Math.max(1, Number((args || {}).limit || 10)));
      const projectId = (args || {}).projectId ? String((args || {}).projectId) : null;
      const category = (args || {}).category ? String((args || {}).category) : null;

      let results: any[];
      if (projectId && category) {
        results = db
          .prepare(
            `SELECT * FROM memories 
             WHERE is_archived = 0 AND project_id = ? AND category = ?
               AND (content LIKE ? OR tags LIKE ?)
             ORDER BY importance DESC, last_accessed DESC
             LIMIT ?`
          )
          .all(projectId, category, `%${query}%`, `%${query}%`, limit);
      } else if (projectId) {
        results = db
          .prepare(
            `SELECT * FROM memories 
             WHERE is_archived = 0 AND project_id = ?
               AND (content LIKE ? OR tags LIKE ?)
             ORDER BY importance DESC, last_accessed DESC
             LIMIT ?`
          )
          .all(projectId, `%${query}%`, `%${query}%`, limit);
      } else if (category) {
        results = db
          .prepare(
            `SELECT * FROM memories 
             WHERE is_archived = 0 AND category = ?
               AND (content LIKE ? OR tags LIKE ?)
             ORDER BY importance DESC, last_accessed DESC
             LIMIT ?`
          )
          .all(category, `%${query}%`, `%${query}%`, limit);
      } else {
        results = searchMemories(query, limit);
      }

      // Update access count for found memories
      const updateAccess = db.prepare(
        `UPDATE memories SET access_count = access_count + 1, last_accessed = unixepoch() WHERE id = ?`
      );
      for (const r of results) updateAccess.run(r.id);

      if (results.length === 0) {
        return { content: [{ type: "text", text: "No memories found matching your query." }] };
      }

      const formatted = results
        .map((m, i) => `[${i + 1}] ${m.content.substring(0, 200)}${m.content.length > 200 ? "..." : ""}\n    Category: ${m.category} | Importance: ${m.importance} | Accessed: ${m.access_count}x`)
        .join("\n\n");

      return {
        content: [
          { type: "text", text: `Found ${results.length} memories:\n\n${formatted}` },
        ],
      };
    }

    case "memory_read": {
      const maxTokens = Math.min(2000, Math.max(50, Number((args || {}).maxTokens || 180)));
      const projectId = (args || {}).projectId ? String((args || {}).projectId) : null;

      let hot = projectId
        ? db
            .prepare(
              `SELECT * FROM memories 
               WHERE is_archived = 0 AND project_id = ?
                 AND (importance >= 70 OR access_count > 2)
               ORDER BY importance DESC, last_accessed DESC`
            )
            .all(projectId)
        : getHotMemories(20);

      // Trim to token budget
      let tokenCount = 0;
      const selected = [];
      for (const m of hot) {
        const tokens = estimateTokens(m.content);
        if (tokenCount + tokens > maxTokens) break;
        selected.push(m);
        tokenCount += tokens;
      }

      if (selected.length === 0) {
        return { content: [{ type: "text", text: "No hot memories available." }] };
      }

      const formatted = selected.map((m) => `- [${m.category}] ${m.content}`).join("\n");
      return {
        content: [
          { type: "text", text: `Hot memories (${tokenCount} tokens):\n\n${formatted}` },
        ],
      };
    }

    case "memory_delete": {
      if ((args || {}).id) {
        const result = db.prepare("DELETE FROM memories WHERE id = ?").run(String((args || {}).id));
        return {
          content: [{ type: "text", text: `Deleted ${result.changes} memory.` }],
        };
      }

      if ((args || {}).olderThan) {
        const cutoff = Math.floor(Date.now() / 1000) - Number((args || {}).olderThan) * 24 * 3600;
        const result = db.prepare("DELETE FROM memories WHERE created_at < ? AND importance < 50").run(cutoff);
        return {
          content: [{ type: "text", text: `Deleted ${result.changes} old memories.` }],
        };
      }

      if ((args || {}).category) {
        const result = db.prepare("DELETE FROM memories WHERE category = ?").run(String((args || {}).category));
        return {
          content: [{ type: "text", text: `Deleted ${result.changes} memories in category '${args.category}'.` }],
        };
      }

      return { content: [{ type: "text", text: "No deletion criteria provided. Use id, olderThan, or category." }] };
    }

    case "memory_status": {
      const total = (db.prepare("SELECT COUNT(*) as c FROM memories").get() as any).c;
      const hot = (db.prepare("SELECT COUNT(*) as c FROM memories WHERE is_archived = 0 AND importance >= 70").get() as any).c;
      const cold = (db.prepare("SELECT COUNT(*) as c FROM memories WHERE is_archived = 1").get() as any).c;
      const avgImportance = (db.prepare("SELECT AVG(importance) as avg FROM memories WHERE is_archived = 0").get() as any).avg || 0;
      const hotMemories = getHotMemories(5);
      const hotTokens = hotMemories.reduce((sum, m) => sum + estimateTokens(m.content), 0);

      return {
        content: [
          {
            type: "text",
            text:
              `Memory Status:\n` +
              `- Total memories: ${total}\n` +
              `- Hot (high importance): ${hot}\n` +
              `- Cold (archived): ${cold}\n` +
              `- Avg importance: ${avgImportance.toFixed(1)}/100\n` +
              `- Hot context: ~${hotTokens} tokens`,
          },
        ],
      };
    }

    case "memory_consolidate": {
      const archiveThreshold = Math.min(100, Math.max(1, Number((args || {}).archiveThreshold || 30)));
      const mergeSimilar = Boolean((args || {}).mergeSimilar ?? true);

      // Archive old low-importance memories
      const oneMonthAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
      const archived = db
        .prepare(
          `UPDATE memories SET is_archived = 1 
           WHERE importance < ? AND last_accessed < ? AND is_archived = 0`
        )
        .run(archiveThreshold, oneMonthAgo);

      let merged = 0;
      if (mergeSimilar) {
        // Simple duplicate detection: identical content
        const dups = db
          .prepare(
            `SELECT content, COUNT(*) as cnt, MIN(id) as keep_id 
             FROM memories WHERE is_archived = 0 
             GROUP BY content HAVING cnt > 1`
          )
          .all();
        for (const dup of dups) {
          const deleted = db
            .prepare("DELETE FROM memories WHERE content = ? AND id != ?")
            .run((dup as any).content, (dup as any).keep_id);
          merged += deleted.changes;
        }
      }

      return {
        content: [
          {
            type: "text",
            text:
              `Consolidation complete:\n` +
              `- Archived: ${archived.changes} old low-importance memories\n` +
              `- Merged/removed: ${merged} duplicates`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ─── Start Server ───

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Kelly MCP Memory Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
