import { asc } from "drizzle-orm";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { sessions, topicDays, topics } from "@/db/schema";
import Planner from "./planner";

export const dynamic = "force-dynamic";

// Load all planner data on the server. This keeps Turso credentials out of the
// browser and lets the first HTML response already contain the user's calendar.
export default async function Home() { await ensureDatabase(); const [topicRows,sessionRows,dayRows]=await Promise.all([db.select().from(topics).orderBy(asc(topics.startDate)),db.select().from(sessions).orderBy(asc(sessions.startsAt)),db.select().from(topicDays)]); return <Planner topics={topicRows} sessions={sessionRows} completedDays={dayRows}/>; }
