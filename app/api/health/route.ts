import { db } from "@/db"; import { sql } from "drizzle-orm";
// Render calls this endpoint to verify both the Next.js server and Turso are
// reachable. A database failure returns 503 so Render does not route bad deploys.
export async function GET(){ try { await db.run(sql`SELECT 1`); return Response.json({status:"ok"}); } catch { return Response.json({status:"unhealthy"},{status:503}); } }
