import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

// Edge-safe: avoid process.cwd() at module level
// Use env var or hardcoded fallback for this VPS deployment
const dbPath = process.env.DB_PATH || "/root/buildany/sqlite.db";
console.log("[DB] Using database at:", dbPath);
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
