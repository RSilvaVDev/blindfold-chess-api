# blindfold-chess-api

NestJS API for Blindfold Chess Coach, a voice-first chess app for blind and low-vision players. The player speaks a move, Stockfish replies out loud, and the player can ask about the position at any time. This service owns authentication checks, per-user settings, and the ElevenLabs text-to-speech proxy with its audio cache. Game logic runs in the web client (`blindfold-chess-web`, a separate repo), not here.

## Scope

In: sign-up/login, per-user settings (voice, verbosity, confirmations), a full game vs Stockfish at 3 levels, spoken or typed moves, disambiguation and promotion questions, board queries, take back, resign, flagging every illegal move or unsupported request with a reason.

Out (do not build unless asked): saving/resuming games, game history, hints, speech rate, voice cloning, multiplayer, opening trainer, analysis, spatial audio, mobile wrapper, daily ElevenLabs character cap.

## Stack

NestJS, TypeScript (strict), Prisma 6 on Supabase Postgres (not Prisma 7: its ESM client and required driver adapter clash with Nest's CommonJS build), Supabase Auth (JWT verification) and Storage (cached audio), ElevenLabs, `@nestjs/throttler`, `class-validator`. Deployed as one Railway service.

## Layout

```
src/
  app.module.ts
  config/            ConfigModule, env schema
  health/            HealthController           GET /health
  prisma/            PrismaModule, PrismaService
  auth/              AuthModule, SupabaseAuthGuard, CurrentUser decorator, AuthUser, MeController (GET /me)
  tts/               TtsModule, TtsController (POST /tts), TtsService, ElevenLabsClient,
                     AudioStorageService, SynthesizeDto, UserThrottlerGuard
  profiles/          ProfilesModule, ProfilesController (GET/PUT /profile), ProfilesService, UpdateProfileDto
prisma/
  schema.prisma      ProfileModel, AudioCacheModel
  migrations/
.github/workflows/ci.yml
```

## Contract with the web client

- Every request except `/health` carries `Authorization: Bearer <Supabase access token>`, verified by `SupabaseAuthGuard`.
- `GET /health`, `GET /me`, `GET /profile`, `PUT /profile` (`voiceId`, `verbosity`, `confirmMoves`), `POST /tts` (`text`, optional `voiceId`; returns an audio URL).
- Verbosity values are `brief`, `standard`, `full`. There is no shared package: when a shared type changes, change it in both repos, one commit each.
- `CORS_ORIGIN` is the web client's Railway URL.

## Commands

```
pnpm install            # postinstall runs prisma generate
pnpm dev                # nest start --watch
pnpm format             # prettier --write .
pnpm format:check       # prettier --check .
pnpm lint               # eslint . (type-aware typescript-eslint rules)
pnpm typecheck          # tsc --noEmit
pnpm build              # nest build
pnpm prisma migrate dev # local schema change
```

## Conventions

- Prisma models end in `Model` and map to snake_case tables with `@@map`: `ProfileModel` → `profiles`, `AudioCacheModel` → `audio_cache`.
- Guards end in `Guard`: `SupabaseAuthGuard`, `UserThrottlerGuard`.
- Files use Nest's kebab-case suffixes: `supabase-auth.guard.ts`, `profiles.service.ts`, `update-profile.dto.ts`.
- One module per feature folder. Controllers stay thin; logic lives in services.
- TypeScript strict. No `any`; narrow unknown input instead.
- Comments are short and state the technical reason. No references to tickets, specs, or people.
- Prettier settings match the web repo.

## Rules that must hold

- Prisma connects as the database owner and bypasses row-level security. Every query is scoped by the user id from `SupabaseAuthGuard`, read with `@CurrentUser()`. Never read a user id from the request body or query string.
- Every migration that creates a table also runs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` with no policies. Supabase exposes `public` tables through its REST API with the public anon key; RLS closes that path while Prisma (the table owner) is unaffected.
- Every request body has a DTO validated by `class-validator` through a global `ValidationPipe` with `whitelist: true`.
- The ElevenLabs key and the Supabase secret key exist only in this service's env. Never return them, log them, or send them to the client.
- `/tts` is protected by `SupabaseAuthGuard` and `UserThrottlerGuard`, and rejects text over the max length in `SynthesizeDto`.
- Audio is cached by a hash of text plus voice id. Check `AudioCacheModel` before calling ElevenLabs.
- Never commit secrets. `.gitignore` covers `.env`, `.env.*` (except `.env.example`), `*.pem`, `*.key`, `node_modules`, `dist`, `coverage`, `*.tsbuildinfo`, and logs. Prisma migrations are committed. Check `git status` for env or key files before every commit.

## Workflow

- Work follows the build plan's commit order, one commit per plan entry, using the plan's commit message.
- Every commit leaves the repo formatting cleanly, type-checking, building, and deployable. Before proposing a commit, run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`. Fix lint errors instead of disabling rules; if a rule is pure noise, turn it off in `eslint.config.mjs` with a one-line reason. CI (`.github/workflows/ci.yml`) runs the same on every push and pull request.
- A change that also needs the web client is two commits, one per repo.

## Environment

`DATABASE_URL` and `DIRECT_URL` (both the session pooler, port 5432), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (storage uploads), `SUPABASE_JWKS_URL` (optional), `AUDIO_BUCKET`, `ELEVENLABS_API_KEY`, `ELEVENLABS_DEFAULT_VOICE_ID`, `CORS_ORIGIN`, `PORT`.

Use Supabase's new API keys (`sb_publishable_...`, `sb_secret_...`). Never the legacy `anon` / `service_role` keys.

Listed with placeholder values in `.env.example`. Validated when the app starts, not at build time, so CI builds without secrets.

## Known gotchas

- `prisma generate` must run before `typecheck` or `build`; the `postinstall` script covers this in CI.
- Both database variables use the session pooler (port 5432, no `?pgbouncer=true`). The direct `db.<ref>.supabase.co` host is IPv6-only on the free plan.
- The project signs JWTs with ES256 (asymmetric). `SupabaseAuthGuard` verifies them with `verifyCredentials` from `@supabase/server/core`, pinned with `issuer: fromSupabaseUrl(SUPABASE_URL)`; `fromSupabaseUrl` is exported from `@supabase/server`, not `/core`. Do not use the deprecated `@supabase/server/adapters/nestjs` (removed December 1, 2026).
- `@supabase/server` is public beta: keep it pinned to an exact version. Its docs ship in `node_modules/@supabase/server/docs/`.
- `@nestjs/throttler` keys by IP by default; `UserThrottlerGuard` overrides `getTracker` to use the user id.
- Railway runs `prisma migrate deploy` on release, then starts the app. The health check points at `/health`.
- Email confirmation is off in Supabase so reviewers can log in immediately.
