import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// A topic is the long-running thing the user wants to learn. Date-only strings
// avoid timezone shifts because these values represent calendar days, not moments.
export const topics = sqliteTable("topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("violet"),
  startDate: text("start_date").notNull(),
  targetDate: text("target_date").notNull(),
  status: text("status", { enum: ["planned", "active", "paused", "completed"] }).notNull().default("planned"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// A study session is a precise appointment, so its start/end values are stored as
// timestamps and converted to the user's local time when rendered.
export const sessions = sqliteTable("study_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topicId: integer("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
  startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
  status: text("status", { enum: ["planned", "completed", "skipped"] }).notNull().default("planned"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Daily completion is modeled separately so progress means "days followed"
// rather than "appointments completed," matching Orbit's daily learning rhythm.
export const topicDays = sqliteTable("topic_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topicId: integer("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [uniqueIndex("idx_topic_days_topic_date").on(table.topicId, table.date)]);
