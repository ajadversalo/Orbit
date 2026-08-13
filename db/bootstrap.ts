import { db } from "./index";
import { sql } from "drizzle-orm";

let ready: Promise<void> | undefined;

// Lazily initialize the schema on the first request. The shared promise prevents
// simultaneous requests from trying to create the same tables more than once.
// IF NOT EXISTS makes this safe for every Render restart and preserves user data.
export function ensureDatabase() {
  ready ??= (async () => {
    // Topics define a learning path and the inclusive date range shown as a
    // colored coverage band across the calendar.
    await db.run(sql`CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'violet', start_date TEXT NOT NULL, target_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned', created_at INTEGER NOT NULL
    )`);
    // Sessions are specific appointments within a topic. They are separate from
    // daily progress so rescheduling a session does not rewrite topic progress.
    await db.run(sql`CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned', created_at INTEGER NOT NULL
    )`);
    // This index supports the common lookup of a topic's sessions in date order.
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sessions_topic_start ON study_sessions(topic_id, starts_at)`);

    // A topic-day row records a single daily check-in. The unique index prevents
    // duplicate completion credit if a button is clicked twice or requests race.
    await db.run(sql`CREATE TABLE IF NOT EXISTS topic_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      date TEXT NOT NULL, completed_at INTEGER NOT NULL
    )`);
    await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_topic_days_topic_date ON topic_days(topic_id, date)`);
  })();
  return ready;
}
