"use server";

import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { sessions, topicDays, topics } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const topicInput = z.object({ title: z.string().trim().min(2).max(80), description: z.string().max(400), color: z.string(), startDate: z.string(), targetDate: z.string() });

// Server Actions are the only write path to Turso. Keeping mutations here means
// the database token never reaches client JavaScript and every input is validated.
export async function createTopic(formData: FormData) {
  await ensureDatabase();
  const parsed = topicInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.targetDate < parsed.data.startDate) return { error: "Please check the topic details and dates." };
  await db.insert(topics).values({ ...parsed.data, status: "active" });
  revalidatePath("/");
  return { ok: true };
}

export async function createSession(formData: FormData) {
  await ensureDatabase();
  const parsed = z.object({ topicId: z.coerce.number().int().positive(), title: z.string().trim().min(2).max(100), date: z.string(), startTime: z.string(), duration: z.coerce.number().min(15).max(480), notes: z.string().max(500) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please complete the session details." };
  // Combine the form's date and time into one timestamp, then derive the end from
  // duration. This keeps the form friendly while storing an unambiguous interval.
  const start = new Date(`${parsed.data.date}T${parsed.data.startTime}:00`);
  const end = new Date(start.getTime() + parsed.data.duration * 60_000);
  await db.insert(sessions).values({ topicId: parsed.data.topicId, title: parsed.data.title, startsAt: start, endsAt: end, notes: parsed.data.notes });
  revalidatePath("/");
  return { ok: true };
}

export async function updateSession(formData: FormData) {
  await ensureDatabase();
  const parsed = z.object({ id: z.coerce.number().int().positive(), topicId: z.coerce.number().int().positive(), title: z.string().trim().min(2).max(100), date: z.string(), startTime: z.string(), duration: z.coerce.number().min(15).max(480), notes: z.string().max(500) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please check the session details." };
  const start = new Date(`${parsed.data.date}T${parsed.data.startTime}:00`);
  const end = new Date(start.getTime() + parsed.data.duration * 60_000);
  await db.update(sessions).set({ topicId: parsed.data.topicId, title: parsed.data.title, startsAt: start, endsAt: end, notes: parsed.data.notes }).where(eq(sessions.id, parsed.data.id));
  revalidatePath("/");
  return { ok: true };
}

export async function toggleSession(id: number, complete: boolean) {
  await ensureDatabase();
  await db.update(sessions).set({ status: complete ? "completed" : "planned" }).where(eq(sessions.id, id));
  revalidatePath("/");
}

export async function reopenTopic(id: number) {
  await ensureDatabase();
  const parsed = z.number().int().positive().safeParse(id);
  if (!parsed.success) return { error: "That topic could not be reopened." };
  await db.update(topics).set({ status: "active" }).where(eq(topics.id, parsed.data));
  revalidatePath("/");
  return { ok: true };
}

export async function toggleTopicDay(topicId: number, date: string, complete: boolean) {
  await ensureDatabase();
  // Daily check-ins are intentionally limited to today. This prevents backfilling
  // a perfect history later and makes the percentage reflect an honest daily habit.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (date !== today) return { error: "Only today's learning check-in can be changed." };
  if (complete) {
    await db.insert(topicDays).values({ topicId, date }).onConflictDoNothing();
    const [topic] = await db.select().from(topics).where(eq(topics.id, topicId));
    if (topic) {
      const completed = await db.select().from(topicDays).where(eq(topicDays.topicId, topicId));
      const total = Math.floor((Date.parse(`${topic.targetDate}T00:00:00Z`) - Date.parse(`${topic.startDate}T00:00:00Z`)) / 86_400_000) + 1;
      const done = completed.filter(day => day.date >= topic.startDate && day.date <= topic.targetDate).length;
      if (total > 0 && done >= total) await db.update(topics).set({ status: "completed" }).where(eq(topics.id, topicId));
    }
  } else {
    await db.delete(topicDays).where(and(eq(topicDays.topicId, topicId), eq(topicDays.date, date)));
    await db.update(topics).set({ status: "active" }).where(eq(topics.id, topicId));
  }
  revalidatePath("/");
  return { ok: true };
}
