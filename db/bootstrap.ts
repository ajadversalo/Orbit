import { db } from "./index";
import { sql } from "drizzle-orm";

let ready: Promise<void> | undefined;
export function ensureDatabase() {
  ready ??= (async () => {
    await db.run(sql`CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'violet', start_date TEXT NOT NULL, target_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned', created_at INTEGER NOT NULL
    )`);
    await db.run(sql`CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned', created_at INTEGER NOT NULL
    )`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sessions_topic_start ON study_sessions(topic_id, starts_at)`);
  })();
  return ready;
}
