# blindfold-chess-api

NestJS API for Blindfold Chess Coach: authentication checks, per-user settings, and text-to-speech for a voice-first chess app.

Work in progress. Full setup and endpoint docs land with the final README.

## Run locally

```
pnpm install                  # also runs prisma generate
cp .env.example .env          # then fill in the Supabase connection strings
pnpm prisma migrate deploy    # create the tables
pnpm dev
curl localhost:3000/health
```

## Environment

| Variable                   | Required | Purpose                                                                                       |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `NODE_ENV`                 | no       | `development` (default), `production`, or `test`                                              |
| `PORT`                     | no       | Port to listen on. Defaults to `3000`; Railway sets it automatically                          |
| `CORS_ORIGIN`              | yes      | Comma-separated origins allowed to call the API from a browser, for example the web app's URL |
| `DATABASE_URL`             | yes      | Supabase session pooler connection string (port 5432), used by Prisma at runtime              |
| `DIRECT_URL`               | yes      | Same session pooler string, used by Prisma migrations                                         |
| `SUPABASE_URL`             | yes      | Project URL, `https://<project-ref>.supabase.co`. JWT signing keys are derived from it        |
| `SUPABASE_PUBLISHABLE_KEY` | no       | `sb_publishable_...`. Part of Supabase's "Server" setup; the API does not need it yet         |
| `SUPABASE_SECRET_KEY`      | later    | `sb_secret_...`, server-only. Needed once cached audio is stored in Supabase Storage          |
| `SUPABASE_JWKS_URL`        | no       | Override for the JWT signing keys. Defaults to `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` |

The app checks these at startup and exits with a clear message if one is missing or malformed.

## Authentication

Every route except `GET /health` requires `Authorization: Bearer <Supabase access token>`. `SupabaseAuthGuard` verifies the token locally with `@supabase/server` against the project's published ES256 keys and rejects tokens issued by any other project. `GET /me` returns the verified user (`id`, `email`, `role`).

## Database

Prisma 6 on Supabase Postgres. Models end in `Model` and map to snake_case tables:

| Model             | Table         | Holds                                                          |
| ----------------- | ------------- | -------------------------------------------------------------- |
| `ProfileModel`    | `profiles`    | Per-user settings: voice, verbosity, move confirmations        |
| `AudioCacheModel` | `audio_cache` | Cached text-to-speech audio, keyed by a hash of voice and text |

Change the schema in `prisma/schema.prisma`, then run `pnpm prisma migrate dev --name <change>` and commit the new folder in `prisma/migrations/`.

## Deploy (Railway)

1. Create a Railway service from this GitHub repo. It redeploys on every push to `main`.
2. Set `CORS_ORIGIN`, `DATABASE_URL`, `DIRECT_URL`, and `SUPABASE_URL`. Leave `PORT` unset.
3. `railway.json` runs `prisma migrate deploy` before each deploy, then the start command, and checks `GET /health`.
