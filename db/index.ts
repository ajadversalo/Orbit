import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Create one server-side database client for the application. We fall back to a
// local SQLite file so development works without cloud credentials, while Render
// uses the Turso URL and token supplied through its private environment settings.
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// Give Drizzle the schema so queries remain typed and table changes are caught
// during the TypeScript build instead of becoming production-only SQL errors.
export const db = drizzle(client, { schema });
