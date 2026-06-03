const Database = require("better-sqlite3");

const sqlite = new Database("./sqlite.db");

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    plan TEXT DEFAULT 'free',
    credits_used INTEGER DEFAULT 0,
    credits_total INTEGER DEFAULT 100
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'web',
    status TEXT DEFAULT 'draft',
    github_repo TEXT,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS project_files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    path TEXT NOT NULL,
    content TEXT,
    language TEXT,
    is_generated INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    model TEXT,
    tokens_used INTEGER,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'web',
    files TEXT,
    author_id TEXT,
    downloads INTEGER DEFAULT 0,
    rating INTEGER DEFAULT 0,
    is_public INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    url TEXT,
    status TEXT DEFAULT 'pending',
    build_log TEXT,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_memory (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_type TEXT NOT NULL,
    content TEXT NOT NULL,
    context TEXT,
    confidence INTEGER DEFAULT 50,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS project_memory (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    memory_type TEXT NOT NULL,
    content TEXT NOT NULL,
    context TEXT,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS platform_patterns (
    id TEXT PRIMARY KEY,
    pattern_type TEXT NOT NULL,
    trigger TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    success_rate INTEGER,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wiki_pages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    page_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    auto_generated INTEGER DEFAULT 1,
    last_updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wiki_relationships (
    id TEXT PRIMARY KEY,
    source_page_id TEXT NOT NULL,
    target_page_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS adrs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    context TEXT NOT NULL,
    decision TEXT NOT NULL,
    consequences TEXT NOT NULL,
    status TEXT DEFAULT 'proposed',
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'idle',
    capabilities TEXT,
    last_heartbeat INTEGER DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    agent_id TEXT,
    parent_task_id TEXT,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    input TEXT,
    output TEXT,
    error_log TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    code TEXT,
    trigger_patterns TEXT,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    context_required TEXT,
    is_shared INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
    updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("✅ Database initialized!");
