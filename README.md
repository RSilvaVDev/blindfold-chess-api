# blindfold-chess-api

NestJS API for **Blindfold Chess Coach**, a voice-first chess app. It has two jobs: verify that a caller is signed in with Supabase, and turn the coach's announcements into speech with ElevenLabs. The game itself (rules, engine, move parsing, narration) runs in the browser, in [blindfold-chess-web](https://github.com/RSilvaVDev/blindfold-chess-web).

## Structure

```
src/
  main.ts                bootstrap: global ValidationPipe, CORS, shutdown hooks, listen on PORT
  app.module.ts          wires the feature modules below
  config/
    env.validation.ts    EnvironmentVariables: every env var, validated at boot
  health/                HealthController           GET /health
  prisma/                PrismaModule, PrismaService (one shared client, global)
  auth/
    supabase-auth.guard.ts    SupabaseAuthGuard: verifies the Bearer JWT, attaches request.user
    current-user.decorator.ts @CurrentUser(): the verified user in a controller
    auth-user.ts              AuthUser { id, email, role }, AuthenticatedRequest
    me.controller.ts          GET /me
  tts/
    tts.controller.ts         POST /tts
    tts.service.ts            hash cache in front of ElevenLabs
    elevenlabs.client.ts      the HTTP call to ElevenLabs
    synthesize.dto.ts         request body rules (text, optional voiceId)
    user-throttler.guard.ts   UserThrottlerGuard: rate limit per user, not per IP
prisma/
  schema.prisma          ProfileModel, AudioCacheModel
  migrations/            SQL migrations (row-level security on every table)
```

Each feature is one Nest module in its own folder. Controllers stay thin and logic lives in services.

## How a request flows

`POST /tts` with `Authorization: Bearer <token>` and `{ "text": "Black plays knight to f6." }`:

1. **CORS** (in `main.ts`) allows only the origins in `CORS_ORIGIN`.
2. **`SupabaseAuthGuard`** reads the Bearer token and verifies it with `verifyCredentials` from `@supabase/server/core`, against the project's published ES256 signing keys, with the issuer pinned to this project. A missing or invalid token is a 401; the verified user is attached as `request.user`.
3. **`UserThrottlerGuard`** extends `@nestjs/throttler` and keys the limit by user id: 40 requests a minute.
4. **`ValidationPipe`** (global, `whitelist` + `forbidNonWhitelisted`) checks the body against `SynthesizeDto`: text up to 600 characters, an optional 20-character voice id, and no unknown fields.
5. **`TtsService`** hashes the voice id and text (SHA-256) and returns the cached MP3 when it has one. It keeps the last 500 clips in memory.
6. On a miss, **`ElevenLabsClient`** calls ElevenLabs (`eleven_flash_v2_5`, 64 kbps MP3, 15 second timeout). Failures are logged by status only and return a generic 503.
7. The controller returns the bytes as `audio/mpeg`.

`GET /me` runs steps 1 and 2 and returns `{ id, email, role }`. `GET /health` has no guards.

## Data

Prisma 6 on Supabase Postgres. Model names end in `Model` and map to snake_case tables with `@@map`.

| Model             | Table         | Purpose                                                 |
| ----------------- | ------------- | ------------------------------------------------------- |
| `ProfileModel`    | `profiles`    | Per-user settings: voice, verbosity, move confirmations |
| `AudioCacheModel` | `audio_cache` | A persistent index of generated speech audio            |

`user_id` is the Supabase JWT subject; there is no foreign key into Supabase's `auth` schema. Prisma connects as the table owner, which bypasses row-level security, so every query must be scoped by the user id from `SupabaseAuthGuard`, never one from the request. Each migration enables row-level security with no policies, which keeps the tables unreachable through Supabase's public REST API.

## Configuration

`config/env.validation.ts` declares every variable on `EnvironmentVariables` with class-validator rules, and `ConfigModule` runs them at boot, so a missing or malformed value stops the app with a clear message. Error messages never echo values, because connection strings and keys are secrets.

| Variable                      | Required | Purpose                                                                                         |
| ----------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `CORS_ORIGIN`                 | yes      | Comma-separated origins allowed to call the API from a browser (no trailing slash)              |
| `DATABASE_URL`                | yes      | Supabase Postgres connection string, used by Prisma at runtime                                  |
| `DIRECT_URL`                  | yes      | Connection string Prisma uses for migrations                                                    |
| `SUPABASE_URL`                | yes      | Project URL; the JWT signing keys are derived from it                                           |
| `ELEVENLABS_API_KEY`          | yes      | ElevenLabs key with the `text_to_speech` permission                                             |
| `ELEVENLABS_DEFAULT_VOICE_ID` | no       | Default voice for `/tts`; the premade "George" voice when unset                                 |
| `SUPABASE_JWKS_URL`           | no       | Overrides where signing keys come from (default `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`) |
| `PORT`, `NODE_ENV`            | no       | Port (default 3000; Railway sets it) and environment (default `development`)                    |

`SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` appear in `.env.example` for features that use Supabase's HTTP APIs; the current code does not read them.

## Prerequisites

### Tools

- **Git**, to clone the repo.
- **Node.js 22 or newer** (`engines` in `package.json`).
- **pnpm 11.28.5**, the version pinned in `packageManager`. Run `corepack enable` once and Node installs it for you.
- **curl** (optional), to check the API from a terminal.

### Accounts and keys

- **A Supabase project** (the free tier is enough), for sign-in and the Postgres database:
  - **Project URL**, from **Connect → Server** (`SUPABASE_URL`).
  - **Database password**, set when the project was created. Reset it under **Project Settings → Database** if you don't have it.
  - **Session pooler connection string**, from **Connect → Session pooler** (port 5432).
  - **Email confirmation off**: **Authentication → Providers → Email**, turn off **Confirm email**, so new accounts can sign in immediately.
- **An ElevenLabs account** with an API key that has the **text_to_speech** permission (**Developers → API keys**). Listing voices is not needed.

### To use the API

- **blindfold-chess-web** running against it, to sign in and play. The API has no UI of its own.

## Run locally

### 1. Install

```
git clone https://github.com/RSilvaVDev/blindfold-chess-api.git
cd blindfold-chess-api
pnpm install            # also runs prisma generate
cp .env.example .env
```

### 2. Fill in `.env`

| Variable                     | Where to find it                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CORS_ORIGIN`                | `http://localhost:5173`, the web app's dev server                                                                                                   |
| `DATABASE_URL`, `DIRECT_URL` | Supabase → **Connect** → **Session pooler** connection string (port 5432). Replace `[YOUR-PASSWORD]`, brackets included, with the database password |
| `SUPABASE_URL`               | Supabase → **Connect** → **Server**: `SUPABASE_URL`, like `https://<project-ref>.supabase.co`                                                       |
| `ELEVENLABS_API_KEY`         | Your ElevenLabs API key                                                                                                                             |

Leave the optional variables unset. If a value is missing or malformed, `pnpm dev` stops and says which one.

### 3. Create the tables and start

```
pnpm prisma migrate deploy    # creates profiles and audio_cache, with row-level security
pnpm dev                      # http://localhost:3000, restarts on file changes
```

### 4. Check it

```
curl localhost:3000/health    # {"status":"ok"}
curl localhost:3000/me        # 401 "Sign in to continue." (needs a Supabase access token)
```

Then run [blindfold-chess-web](https://github.com/RSilvaVDev/blindfold-chess-web) against it to sign in and play.

## Scripts

| Script              | Does                                     |
| ------------------- | ---------------------------------------- |
| `pnpm dev`          | Nest in watch mode                       |
| `pnpm build`        | `nest build` to `dist/`                  |
| `pnpm start:prod`   | runs `dist/main`                         |
| `pnpm format:check` | Prettier                                 |
| `pnpm lint`         | ESLint with type-aware typescript-eslint |
| `pnpm typecheck`    | `tsc --noEmit`                           |

GitHub Actions runs format, lint, typecheck, and build on every push and pull request. Schema changes go in `prisma/schema.prisma`, then `pnpm prisma migrate dev --name <change>`, committing the new migration folder.

## Deployment

One Railway service built by Railpack. `railway.json` runs `prisma migrate deploy` before each deploy, starts `pnpm start:prod`, and health-checks `GET /health`. Configuration comes from Railway's service variables; the public domain's target port must match the port the app listens on.
