/**
 * MCP Memory Client for BuildAny
 * 
 * Provides a simple HTTP interface to the memory system.
 * Used by the orchestrator to read/write memories during code generation.
 */

import Database from "better-sqlite3";
import { join } from "path";

const MEMORY_DB_PATH = process.env.MEMORY_DB_PATH || join(process.cwd(), "data", "memory.db");

// Lazy init — only opens DB when first used
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(MEMORY_DB_PATH);
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
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(content, tags, content=memories, content_rowid=id);
    `);
  }
  return db;
}

export interface MemoryEntry {
  id: string;
  content: string;
  category: string;
  importance: number;
  accessCount: number;
  createdAt: Date;
  projectId?: string;
  tags?: string;
  isArchived: boolean;
}

export interface MemoryWriteOptions {
  content: string;
  category?: "user" | "project" | "tech" | "design" | "decision" | "general";
  importance?: number; // 1-100
  projectId?: string;
  tags?: string;
}

export interface MemorySearchOptions {
  query: string;
  limit?: number;
  projectId?: string;
  category?: string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── Public API ───

export const memoryClient = {
  /**
   * Store a new memory/fact
   */
  write(opts: MemoryWriteOptions): MemoryEntry {
    const db = getDb();
    const id = generateId();
    const category = opts.category || "general";
    const importance = Math.min(100, Math.max(1, opts.importance || 50));
    const now = Math.floor(Date.now() / 1000);

    db.prepare(
      `INSERT INTO memories (id, content, category, importance, project_id, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, opts.content, category, importance, opts.projectId || null, opts.tags || null, now, now);

    return {
      id,
      content: opts.content,
      category,
      importance,
      accessCount: 0,
      createdAt: new Date(),
      projectId: opts.projectId,
      tags: opts.tags,
      isArchived: false,
    };
  },

  /**
   * Search memories by keyword
   */
  search(opts: MemorySearchOptions): MemoryEntry[] {
    const db = getDb();
    const query = opts.query;
    const limit = Math.min(50, Math.max(1, opts.limit || 10));

    let results: any[];
    if (opts.projectId && opts.category) {
      results = db
        .prepare(
          `SELECT * FROM memories 
           WHERE is_archived = 0 AND project_id = ? AND category = ?
             AND (content LIKE ? OR tags LIKE ?)
           ORDER BY importance DESC, last_accessed DESC
           LIMIT ?`
        )
        .all(opts.projectId, opts.category, `%${query}%`, `%${query}%`, limit);
    } else if (opts.projectId) {
      results = db
        .prepare(
          `SELECT * FROM memories 
           WHERE is_archived = 0 AND project_id = ?
             AND (content LIKE ? OR tags LIKE ?)
           ORDER BY importance DESC, last_accessed DESC
           LIMIT ?`
        )
        .all(opts.projectId, `%${query}%`, `%${query}%`, limit);
    } else {
      results = db
        .prepare(
          `SELECT * FROM memories 
           WHERE is_archived = 0
             AND (content LIKE ? OR tags LIKE ?)
           ORDER BY importance DESC, last_accessed DESC
           LIMIT ?`
        )
        .all(`%${query}%`, `%${query}%`, limit);
    }

    // Update access counts
    const updateAccess = db.prepare(
      `UPDATE memories SET access_count = access_count + 1, last_accessed = ? WHERE id = ?`
    );
    const now = Math.floor(Date.now() / 1000);
    for (const r of results) updateAccess.run(now, r.id);

    return results.map((r) => ({
      id: r.id,
      content: r.content,
      category: r.category,
      importance: r.importance,
      accessCount: r.access_count,
      createdAt: new Date(r.created_at * 1000),
      projectId: r.project_id || undefined,
      tags: r.tags || undefined,
      isArchived: !!r.is_archived,
    }));
  },

  /**
   * Get hot memories for context injection (under token budget)
   */
  readHot(maxTokens = 180, projectId?: string): { memories: MemoryEntry[]; tokenCount: number } {
    const db = getDb();
    const oneWeekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;

    let results: any[];
    if (projectId) {
      results = db
        .prepare(
          `SELECT * FROM memories 
           WHERE is_archived = 0 AND project_id = ?
             AND (importance >= 70 OR created_at > ? OR access_count > 2)
           ORDER BY importance DESC, last_accessed DESC`
        )
        .all(projectId, oneWeekAgo);
    } else {
      results = db
        .prepare(
          `SELECT * FROM memories 
           WHERE is_archived = 0
             AND (importance >= 70 OR created_at > ? OR access_count > 2)
           ORDER BY importance DESC, last_accessed DESC
           LIMIT 20`
        )
        .all(oneWeekAgo);
    }

    let tokenCount = 0;
    const selected: MemoryEntry[] = [];
    for (const r of results) {
      const tokens = estimateTokens(r.content);
      if (tokenCount + tokens > maxTokens) break;
      selected.push({
        id: r.id,
        content: r.content,
        category: r.category,
        importance: r.importance,
        accessCount: r.access_count,
        createdAt: new Date(r.created_at * 1000),
        projectId: r.project_id || undefined,
        tags: r.tags || undefined,
        isArchived: !!r.is_archived,
      });
      tokenCount += tokens;
    }

    return { memories: selected, tokenCount };
  },

  /**
   * Get all memories for a project
   */
  getProjectMemories(projectId: string, limit = 50): MemoryEntry[] {
    const db = getDb();
    const results = db
      .prepare(
        `SELECT * FROM memories 
         WHERE project_id = ? AND is_archived = 0
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(projectId, limit);

    return results.map((r) => ({
      id: r.id,
      content: r.content,
      category: r.category,
      importance: r.importance,
      accessCount: r.access_count,
      createdAt: new Date(r.created_at * 1000),
      projectId: r.project_id || undefined,
      tags: r.tags || undefined,
      isArchived: !!r.is_archived,
    }));
  },

  /**
   * Delete a memory by ID
   */
  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare("DELETE FROM memories WHERE id = ?").run(id);
    return result.changes > 0;
  },

  /**
   * Get memory statistics
   */
  status(): { total: number; hot: number; cold: number; avgImportance: number; hotTokens: number } {
    const db = getDb();
    const total = (db.prepare("SELECT COUNT(*) as c FROM memories").get() as any).c;
    const hot = (db.prepare("SELECT COUNT(*) as c FROM memories WHERE is_archived = 0 AND importance >= 70").get() as any).c;
    const cold = (db.prepare("SELECT COUNT(*) as c FROM memories WHERE is_archived = 1").get() as any).c;
    const avgImportance = (db.prepare("SELECT AVG(importance) as avg FROM memories WHERE is_archived = 0").get() as any).avg || 0;

    const hotMemories = this.readHot(2000);
    return { total, hot, cold, avgImportance: Math.round(avgImportance * 10) / 10, hotTokens: hotMemories.tokenCount };
  },

  /**
   * Consolidate: archive old low-importance memories, remove duplicates
   */
  consolidate(archiveThreshold = 30): { archived: number; merged: number } {
    const db = getDb();
    const oneMonthAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;

    const archived = db
      .prepare(
        `UPDATE memories SET is_archived = 1 
         WHERE importance < ? AND last_accessed < ? AND is_archived = 0`
      )
      .run(archiveThreshold, oneMonthAgo);

    // Remove duplicate content
    const dups = db
      .prepare(
        `SELECT content, COUNT(*) as cnt, MIN(id) as keep_id 
         FROM memories WHERE is_archived = 0 
         GROUP BY content HAVING cnt > 1`
      )
      .all();

    let merged = 0;
    for (const dup of dups) {
      const deleted = db.prepare("DELETE FROM memories WHERE content = ? AND id != ?").run(dup.content, dup.keep_id);
      merged += deleted.changes;
    }

    return { archived: archived.changes, merged };
  },
};

export default memoryClient;
