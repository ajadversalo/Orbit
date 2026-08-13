# Orbit

A personal learning calendar built with Next.js, Drizzle, and Turso.

## Local development

Copy `.env.example` to `.env.local`, then run `npm install` and `npm run dev`.
Without Turso credentials, the app automatically uses `local.db`.

## Production

Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Render. The included `render.yaml` contains the remaining service configuration.
