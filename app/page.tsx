import { asc } from "drizzle-orm";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { sessions, topics } from "@/db/schema";
import Planner from "./planner";

export const dynamic = "force-dynamic";
export default async function Home() { await ensureDatabase(); const [topicRows,sessionRows]=await Promise.all([db.select().from(topics).orderBy(asc(topics.startDate)),db.select().from(sessions).orderBy(asc(sessions.startsAt))]); return <Planner topics={topicRows} sessions={sessionRows}/>; }
