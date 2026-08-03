import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

// Lazy DB connection — only connects when first used
// Prevents Server Component crashes if DB file is missing at import time
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sqlite: Database.Database | null = null;

function getDbPath(): string {
  return process.env.DB_PATH || "/root/buildany/sqlite.db";
}

function ensureDbDir(dbPath: string): void {
  const fs = require("fs");
  const path = require("path");
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb() {
  if (_db) return _db;

  const dbPath = getDbPath();
  console.log("[DB] Connecting to:", dbPath);
  ensureDbDir(dbPath);

  _sqlite = new Database(dbPath);
  _db = drizzle(_sqlite, { schema });
  return _db;
}

// Backward-compatible export — still works for existing imports
// But prefer `getDb()` for new code to ensure lazy loading
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop: string | symbol) {
    const database = getDb();
    return (database as any)[prop];
  },
});
