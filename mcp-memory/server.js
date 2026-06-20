const Database = require('better-sqlite3');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());

// SQLite store
const db = new Database('/root/buildany/data/memory.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY, type TEXT, key TEXT, content TEXT,
    project_id TEXT, user_id TEXT, priority TEXT DEFAULT 'warm',
    tags TEXT DEFAULT '[]', created_at INTEGER, updated_at INTEGER,
    access_count INTEGER DEFAULT 0, last_accessed INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_type ON memories(type);
  CREATE INDEX IF NOT EXISTS idx_project ON memories(project_id);
  CREATE INDEX IF NOT EXISTS idx_priority ON memories(priority);
`);

// Health
app.get('/health', (_req, res) => {
  const total = db.prepare("SELECT COUNT(*) as c FROM memories").get().c;
  const hot = db.prepare("SELECT COUNT(*) as c FROM memories WHERE priority='hot'").get().c;
  res.json({ status: 'ok', memories: { total, hot } });
});

// Write
app.post('/tools/memory_write', (req, res) => {
  try {
    const { type, key, content, projectId, userId, priority, tags } = req.body;
    if (!type || !key || !content) return res.status(400).json({ error: 'Missing fields' });
    const id = crypto.randomUUID();
    const now = Date.now();
    db.prepare('INSERT INTO memories VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, type, key, content, projectId||null, userId||null,
        priority||'warm', JSON.stringify(tags||[]), now, now, 0, now);
    res.json({ success: true, id, key });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Search
app.post('/tools/memory_search', (req, res) => {
  try {
    const { query, limit } = req.body;
    if (!query) return res.status(400).json({ error: 'Missing query' });
    const rows = db.prepare("SELECT * FROM memories WHERE key LIKE ? OR content LIKE ? LIMIT ?")
      .all('%'+query+'%', '%'+query+'%', limit||10);
    const results = rows.map(r => ({
      id: r.id, type: r.type, key: r.key, content: r.content.substring(0,500),
      priority: r.priority, tags: JSON.parse(r.tags||'[]')
    }));
    res.json({ success: true, count: results.length, results });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Context
app.post('/context', (req, res) => {
  try {
    const { projectId, maxTokens } = req.body;
    let sql = "SELECT * FROM memories WHERE priority='hot'";
    const params = [];
    if (projectId) { sql += " AND (project_id=? OR project_id IS NULL)"; params.push(projectId); }
    sql += " ORDER BY access_count DESC LIMIT 20";
    const rows = db.prepare(sql).all(...params);
    let context = '', tokens = 0;
    for (const r of rows) {
      const entry = `[${r.type}] ${r.key}: ${r.content}`;
      const t = Math.ceil(entry.length * 0.25);
      if (tokens + t > (maxTokens||180) && context) break;
      context += entry + '\n';
      tokens += t;
      db.prepare("UPDATE memories SET access_count=access_count+1, last_accessed=? WHERE id=?")
        .run(Date.now(), r.id);
    }
    res.json({ success: true, context: context||'', memoryCount: rows.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`[Kelly Memory] Running on port ${PORT}`));
