/**
 * Lightweight Memory Server for BuildAny
 * 
 * Simple HTTP API for persistent memory storage.
 * No MCP protocol overhead — just JSON CRUD operations.
 */

import Database from "better-sqlite3";
import { createServer } from "http";
import { join } from "path";

const MEMORY_DB_PATH = process.env.MEMORY_DB_PATH || join(process.cwd(), "data", "memory.db");
const PORT = process.env.MEMORY_PORT || 3001;

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

  CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_id);
  CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
  CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
  CREATE INDEX IF NOT EXISTS idx_memories_archived ON memories(is_archived);
  CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(content, tags, content='memories', content_rowid='rowid');
`);

// ─── Helper Functions ───

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function getHotMemories(projectId?: string, limit = 10) {
  let sql = `
    SELECT * FROM memories 
    WHERE is_archived = 0 
    ${projectId ? "AND project_id = ?" : "AND project_id IS NULL"}
    ORDER BY 
      (importance * 2 + access_count) DESC,
      last_accessed DESC
    LIMIT ?
  `;
  const stmt = db.prepare(sql);
  return projectId ? stmt.all(projectId, limit) : stmt.all(limit);
}

function searchMemories(query: string, projectId?: string, limit = 10) {
  // Full-text search
  const sql = `
    SELECT m.* FROM memories m
    JOIN memories_fts fts ON m.rowid = fts.rowid
    WHERE memories_fts MATCH ?
    ${projectId ? "AND m.project_id = ?" : ""}
    AND m.is_archived = 0
    ORDER BY rank
    LIMIT ?
  `;
  const stmt = db.prepare(sql);
  const params = projectId ? [query, projectId, limit] : [query, limit];
  return stmt.all(...params);
}

// ─── HTTP Server ───

const server = createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const path = url.pathname;

  // Parse JSON body
  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", () => {
    let data: any = {};
    try {
      if (body) data = JSON.parse(body);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    try {
      // ─── WRITE ───
      if (path === "/write" && req.method === "POST") {
        const { content, category = "general", importance = 50, project_id, tags } = data;
        if (!content) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "content required" }));
          return;
        }
        const id = generateId();
        const tagStr = Array.isArray(tags) ? tags.join(",") : tags || "";
        
        db.prepare(`
          INSERT INTO memories (id, content, category, importance, project_id, tags)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, content, category, importance, project_id || null, tagStr);
        
        // Update FTS index
        db.prepare(`INSERT INTO memories_fts(rowid, content, tags) VALUES (last_insert_rowid(), ?, ?)`)
          .run(content, tagStr);
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, id }));
        return;
      }

      // ─── READ ───
      if (path === "/read" && req.method === "GET") {
        const id = url.searchParams.get("id");
        const projectId = url.searchParams.get("project_id");
        
        if (id) {
          const row = db.prepare("SELECT * FROM memories WHERE id = ?").get(id);
          if (row) {
            db.prepare("UPDATE memories SET access_count = access_count + 1, last_accessed = unixepoch() WHERE id = ?").run(id);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, memory: row }));
          return;
        }
        
        const rows = getHotMemories(projectId || undefined);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, memories: rows }));
        return;
      }

      // ─── SEARCH ───
      if (path === "/search" && req.method === "POST") {
        const { query, project_id, limit = 10 } = data;
        if (!query) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "query required" }));
          return;
        }
        
        const results = searchMemories(query, project_id, limit);
        
        // Update access counts
        const updateStmt = db.prepare("UPDATE memories SET access_count = access_count + 1, last_accessed = unixepoch() WHERE id = ?");
        for (const row of results) {
          updateStmt.run(row.id);
        }
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, results }));
        return;
      }

      // ─── DELETE ───
      if (path === "/delete" && req.method === "POST") {
        const { id } = data;
        if (!id) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "id required" }));
          return;
        }
        db.prepare("DELETE FROM memories WHERE id = ?").run(id);
        db.prepare("DELETE FROM memories_fts WHERE rowid = (SELECT rowid FROM memories WHERE id = ?)").run(id);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // ─── STATUS ───
      if (path === "/status" && req.method === "GET") {
        const total = (db.prepare("SELECT COUNT(*) as count FROM memories").get() as any).count;
        const hot = (db.prepare("SELECT COUNT(*) as count FROM memories WHERE is_archived = 0").get() as any).count;
        const archived = (db.prepare("SELECT COUNT(*) as count FROM memories WHERE is_archived = 1").get() as any).count;
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, total, hot, archived }));
        return;
      }

      // ─── CONSOLIDATE ───
      if (path === "/consolidate" && req.method === "POST") {
        const { project_id, minImportance = 30, maxAge = 90 } = data;
        
        // Archive old, low-importance memories
        const cutoff = Date.now() - (maxAge * 24 * 60 * 60 * 1000);
        const result = db.prepare(`
          UPDATE memories 
          SET is_archived = 1 
          WHERE importance < ? 
          AND created_at < ?
          ${project_id ? "AND project_id = ?" : ""}
        `).run(minImportance, Math.floor(cutoff / 1000), project_id);
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, archived: result.changes }));
        return;
      }

      // 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      
    } catch (error) {
      console.error("Memory server error:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }));
    }
  });
});

// Try preferred port, fallback to random available port
function startServer(preferredPort: number) {
  server.listen(preferredPort, () => {
    const actualPort = (server.address() as any)?.port || preferredPort;
    console.log(`🧠 Memory Server running on http://localhost:${actualPort}`);
    console.log(`   Endpoints: /write, /read, /search, /delete, /status, /consolidate`);
    
    // Write port to file so client can discover it
    const fs = require('fs');
    const portFile = join(process.cwd(), 'data', '.memory-port');
    fs.writeFileSync(portFile, String(actualPort));
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${preferredPort} in use, trying random port...`);
      server.listen(0); // 0 = random available port
    } else {
      console.error('Memory server error:', err);
      process.exit(1);
    }
  });
}

startServer(Number(PORT));
