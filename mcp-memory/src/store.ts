import Database from 'better-sqlite3';
import path from 'path';

export interface MemoryEntry {
  id: string;
  type: 'fact' | 'preference' | 'decision' | 'pattern' | 'bugfix' | 'project';
  key: string;
  content: string;
  projectId?: string;
  userId?: string;
  priority: 'hot' | 'warm' | 'cold';
  tags: string[];
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  relevance: number;
}

export class MemoryStore {
  private db: Database.Database;

  constructor(dbPath: string = '/data/memory.db') {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    // Main memories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        key TEXT NOT NULL,
        content TEXT NOT NULL,
        project_id TEXT,
        user_id TEXT,
        priority TEXT DEFAULT 'warm',
        tags TEXT DEFAULT '[]',
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch()),
        access_count INTEGER DEFAULT 0,
        last_accessed INTEGER DEFAULT (unixepoch())
      );
    `);

    // Full-text search virtual table
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        key, content,
        content_rowid=id,
        content='memories'
      );
    `);

    // Triggers to keep FTS in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_fts_insert AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, key, content) VALUES (new.id, new.key, new.content);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_fts_update AFTER UPDATE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, key, content) VALUES ('delete', old.id, old.key, old.content);
        INSERT INTO memories_fts(rowid, key, content) VALUES (new.id, new.key, new.content);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_fts_delete AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, key, content) VALUES ('delete', old.id, old.key, old.content);
      END;
    `);

    // Context log for tracking what was injected
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS context_log (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        memory_ids TEXT NOT NULL,
        context_text TEXT NOT NULL,
        token_estimate INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      );
    `);

    // Indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_id);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_priority ON memories(priority);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);`);
  }

  write(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessed'>): MemoryEntry {
    const id = crypto.randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO memories (id, type, key, content, project_id, user_id, priority, tags, created_at, updated_at, access_count, last_accessed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entry.type,
      entry.key,
      entry.content,
      entry.projectId || null,
      entry.userId || null,
      entry.priority,
      JSON.stringify(entry.tags),
      now,
      now,
      0,
      now
    );

    return this.getById(id)!;
  }

  getById(id: string): MemoryEntry | null {
    const row = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(id) as any;
    return row ? this.rowToEntry(row) : null;
  }

  search(query: string, options?: {
    type?: string;
    projectId?: string;
    userId?: string;
    limit?: number;
    minRelevance?: number;
  }): MemorySearchResult[] {
    const limit = options?.limit || 10;
    const minRelevance = options?.minRelevance || 0.1;

    // Use FTS for text search, then rank by relevance + priority + recency
    const ftsQuery = query.split(/\s+/).map(w => `${w}*`).join(' ');

    let sql = `
      SELECT m.*,
        (bm25(memories_fts) * -1 + 10) as relevance_score,
        CASE m.priority
          WHEN 'hot' THEN 3
          WHEN 'warm' THEN 2
          WHEN 'cold' THEN 1
        END as priority_boost,
        (m.access_count * 0.1) as access_boost
      FROM memories m
      JOIN memories_fts ON memories_fts.rowid = m.id
      WHERE memories_fts MATCH ?
    `;

    const params: any[] = [ftsQuery];

    if (options?.type) {
      sql += ' AND m.type = ?';
      params.push(options.type);
    }
    if (options?.projectId) {
      sql += ' AND m.project_id = ?';
      params.push(options.projectId);
    }
    if (options?.userId) {
      sql += ' AND m.user_id = ?';
      params.push(options.userId);
    }

    sql += `
      ORDER BY (relevance_score + priority_boost + access_boost) DESC
      LIMIT ?
    `;
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows
      .map(row => ({
        entry: this.rowToEntry(row),
        relevance: Math.min(1, Math.max(0, (row.relevance_score + row.priority_boost + row.access_boost) / 15))
      }))
      .filter(r => r.relevance >= minRelevance);
  }

  getHotContext(projectId?: string, userId?: string, maxTokens: number = 180): MemoryEntry[] {
    // Get hot memories first, then warm, until token limit
    const memories: MemoryEntry[] = [];
    let estimatedTokens = 0;
    const tokenPerChar = 0.25; // rough estimate

    for (const priority of ['hot', 'warm', 'cold']) {
      let sql = 'SELECT * FROM memories WHERE priority = ?';
      const params: any[] = [priority];

      if (projectId) {
        sql += ' AND (project_id = ? OR project_id IS NULL)';
        params.push(projectId);
      }
      if (userId) {
        sql += ' AND (user_id = ? OR user_id IS NULL)';
        params.push(userId);
      }

      sql += ' ORDER BY access_count DESC, last_accessed DESC';

      const rows = this.db.prepare(sql).all(...params) as any[];

      for (const row of rows) {
        const entry = this.rowToEntry(row);
        const entryTokens = Math.ceil(entry.content.length * tokenPerChar);

        if (estimatedTokens + entryTokens > maxTokens) {
          if (priority === 'hot') continue; // Always try to fit hot memories
          break;
        }

        memories.push(entry);
        estimatedTokens += entryTokens;
      }
    }

    // Update access counts
    for (const mem of memories) {
      this.db.prepare(`
        UPDATE memories SET access_count = access_count + 1, last_accessed = ? WHERE id = ?
      `).run(Date.now(), mem.id);
    }

    return memories;
  }

  updatePriority(id: string, priority: 'hot' | 'warm' | 'cold'): boolean {
    const result = this.db.prepare(`
      UPDATE memories SET priority = ?, updated_at = ? WHERE id = ?
    `).run(priority, Date.now(), id);
    return result.changes > 0;
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
    return result.changes > 0;
  }

  deleteByProject(projectId: string): number {
    const result = this.db.prepare('DELETE FROM memories WHERE project_id = ?').run(projectId);
    return result.changes;
  }

  getStats(): { total: number; hot: number; warm: number; cold: number } {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM memories').get() as any;
    const hot = this.db.prepare("SELECT COUNT(*) as count FROM memories WHERE priority = 'hot'").get() as any;
    const warm = this.db.prepare("SELECT COUNT(*) as count FROM memories WHERE priority = 'warm'").get() as any;
    const cold = this.db.prepare("SELECT COUNT(*) as count FROM memories WHERE priority = 'cold'").get() as any;

    return {
      total: total.count,
      hot: hot.count,
      warm: warm.count,
      cold: cold.count
    };
  }

  consolidate(): { merged: number; deleted: number } {
    // Find similar memories and merge them
    const duplicates = this.db.prepare(`
      SELECT key, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM memories
      GROUP BY key
      HAVING count > 1
    `).all() as any[];

    let merged = 0;
    let deleted = 0;

    for (const dup of duplicates) {
      const ids = dup.ids.split(',');
      const keep = ids[0];
      const remove = ids.slice(1);

      // Merge content from duplicates into the first one
      const contents = this.db.prepare(
        `SELECT content FROM memories WHERE id IN (${remove.map(() => '?').join(',')})`
      ).all(...remove) as any[];

      const mergedContent = contents.map(c => c.content).join('\n---\n');

      this.db.prepare(`
        UPDATE memories SET content = content || ?, updated_at = ? WHERE id = ?
      `).run('\n---\n' + mergedContent, Date.now(), keep);

      for (const id of remove) {
        this.delete(id);
        deleted++;
      }
      merged++;
    }

    // Delete very old cold memories
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const oldResult = this.db.prepare(`
      DELETE FROM memories WHERE priority = 'cold' AND last_accessed < ?
    `).run(thirtyDaysAgo);
    deleted += oldResult.changes;

    return { merged, deleted };
  }

  private rowToEntry(row: any): MemoryEntry {
    return {
      id: row.id,
      type: row.type,
      key: row.key,
      content: row.content,
      projectId: row.project_id,
      userId: row.user_id,
      priority: row.priority,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      accessCount: row.access_count,
      lastAccessed: row.last_accessed
    };
  }

  close() {
    this.db.close();
  }
}
