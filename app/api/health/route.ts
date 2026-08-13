import { db } from "@/db"; import { sql } from "drizzle-orm";
export async function GET(){ try { await db.run(sql`SELECT 1`); return Response.json({status:"ok"}); } catch { return Response.json({status:"unhealthy"},{status:503}); } }
