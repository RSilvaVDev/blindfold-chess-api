# blindfold-chess-api

NestJS API for **Blindfold Chess Coach**, a voice-first chess app for blind and low-vision players. This service verifies Supabase sign-ins and turns the coach's announcements into speech with ElevenLabs. The game itself (rules, Stockfish, narration) runs in the browser: see [blindfold-chess-web](https://github.com/RSilvaVDev/blindfold-chess-web), which has the main project README.

- Deployed API: `<API_RAILWAY_URL>` (health check at `/health`)

## Endpoints

| Method and path | Auth   | Purpose                                                                                                 |
| --------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `GET /health`   | none   | `{ "status": "ok" }` for Railway's health check                                                         |
| `GET /me`       | Bearer | The verified user: `{ id, email, role }`                                                                |
| `POST /tts`     | Bearer | `{ text, voiceId? }` → `audio/mpeg`. Max 600 characters, 40 requests a minute per user, in-memory cache |

Every route except `/health` needs `Authorization: Bearer <Supabase access token>`. `SupabaseAuthGuard` verifies it locally against the project's published ES256 keys and rejects tokens from any other project. Request bodies are validated by a global `ValidationPipe` that rejects unknown fields.

## Run locally

Requires Node 22+ and pnpm, a Supabase project, and an ElevenLabs API key with the `text_to_speech` permission.

```
pnpm install                  # also runs prisma generate
cp .env.example .env          # fill in the values below
pnpm prisma migrate deploy    # create the tables
pnpm dev                      # http://localhost:3000
curl localhost:3000/health
```

## Environment

| Variable                      | Required | Purpose                                                                                       |
| ----------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `NODE_ENV`                    | no       | `development` (default), `production`, or `test`                                              |
| `PORT`                        | no       | Port to listen on. Defaults to `3000`; Railway sets it automatically                          |
| `CORS_ORIGIN`                 | yes      | Comma-separated origins allowed to call the API from a browser, for example the web app's URL |
| `DATABASE_URL`                | yes      | Supabase Postgres connection string (session pooler, port 5432), used by Prisma               |
| `DIRECT_URL`                  | yes      | Connection string Prisma uses for migrations (the same session pooler string works)           |
| `SUPABASE_URL`                | yes      | Project URL, `https://<project-ref>.supabase.co`. JWT signing keys are derived from it        |
| `SUPABASE_PUBLISHABLE_KEY`    | no       | `sb_publishable_...`. Not used by the API yet                                                 |
| `SUPABASE_SECRET_KEY`         | no       | `sb_secret_...`. Reserved for a Storage-backed audio cache                                    |
| `SUPABASE_JWKS_URL`           | no       | Override for the JWT signing keys. Defaults to `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` |
| `ELEVENLABS_API_KEY`          | yes      | ElevenLabs key with the `text_to_speech` permission. Server-only                              |
| `ELEVENLABS_DEFAULT_VOICE_ID` | no       | Voice for `/tts`. Defaults to the premade "George" voice                                      |

The app checks these at startup and exits with a clear message if one is missing or malformed. Real values live only in `.env` (git-ignored) and Railway's service variables.

## Database

Prisma 6 on Supabase Postgres. Models end in `Model` and map to snake_case tables, and every table has row-level security enabled so Supabase's public REST API cannot reach it.

| Model             | Table         | Holds                                                             |
| ----------------- | ------------- | ----------------------------------------------------------------- |
| `ProfileModel`    | `profiles`    | Per-user settings (voice, verbosity, confirmations); not used yet |
| `AudioCacheModel` | `audio_cache` | Reserved for a cache of speech audio that survives restarts       |

## Quality checks

`pnpm format:check`, `pnpm lint` (type-aware typescript-eslint), `pnpm typecheck`, and `pnpm build`. GitHub Actions runs all four on every push and pull request.

## Deploy (Railway)

1. Create a Railway service from this repo. It redeploys on every push to `main`.
2. Set the required variables above. Leave `PORT` unset.
3. `railway.json` runs `prisma migrate deploy` before each deploy, starts the app, and checks `GET /health`.

## Not done yet

- `GET` and `PUT /profile` for saved settings.
- Storing speech audio in Supabase Storage, so the cache survives restarts.
- API tests.
