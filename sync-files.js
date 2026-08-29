const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const db = new Database('/data/projects/buildany.db');
const projectId = process.argv[2] || '074890a0-4116-49e8-b7a5-ed119027470d';
const projectDir = '/data/projects/' + projectId;
let count = 0;

function scanDir(dir, basePath) {
  basePath = basePath || '';
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules','.next','out','.git','.harness-logs'].includes(entry.name)) continue;
    const relPath = basePath ? basePath + '/' + entry.name : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath, relPath);
    } else {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const ext = path.extname(entry.name).slice(1);
      const now = new Date().toISOString();
      
      const existing = db.prepare('SELECT id FROM project_files WHERE project_id = ? AND path = ?').get(projectId, relPath);
      if (existing) {
        db.prepare('UPDATE project_files SET content = ?, language = ?, updated_at = ? WHERE id = ?')
          .run(content, ext, now, existing.id);
      } else {
        db.prepare('INSERT INTO project_files (id, project_id, path, content, language, is_generated, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(randomUUID(), projectId, relPath, content, ext, 1, now, now);
      }
      count++;
    }
  }
}

scanDir(projectDir);
console.log('Synced ' + count + ' files to DB');
db.close();
