"use server";

import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { sessions, topics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const topicInput = z.object({ title: z.string().trim().min(2).max(80), description: z.string().max(400), color: z.string(), startDate: z.string(), targetDate: z.string() });

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
