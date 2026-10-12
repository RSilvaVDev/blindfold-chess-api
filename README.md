# blindfold-chess-api

NestJS API for Blindfold Chess Coach: authentication checks, per-user settings, and text-to-speech for a voice-first chess app.

Work in progress. Full setup and endpoint docs land with the final README.

## Run locally

```
pnpm install
cp .env.example .env
pnpm dev
curl localhost:3000/health
```

## Environment

| Variable      | Required | Purpose                                                                                       |
| ------------- | -------- | --------------------------------------------------------------------------------------------- |
| `NODE_ENV`    | no       | `development` (default), `production`, or `test`                                              |
| `PORT`        | no       | Port to listen on. Defaults to `3000`; Railway sets it automatically                          |
| `CORS_ORIGIN` | yes      | Comma-separated origins allowed to call the API from a browser, for example the web app's URL |

The app checks these at startup and exits with a clear message if one is missing or malformed.

## Deploy (Railway)

1. Create a Railway service from this GitHub repo. It redeploys on every push to `main`.
2. Set `CORS_ORIGIN` to the web app's Railway URL (no trailing slash). Leave `PORT` unset.
3. `railway.json` sets the start command and the health check (`GET /health`).
