# CodexDash

CodexDash is a mobile-first dashboard for monitoring multiple OpenAI Codex accounts from one place.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui-style components
- **Backend:** NestJS
- **Database:** Prisma + SQLite
- **Auth:** CodexDash email/password auth with JWT

## What it does

- Create a CodexDash account and sign in
- Connect multiple OpenAI Codex accounts under one CodexDash account
- Start an integrated OpenAI login popup instead of pasting cookies manually
- Refresh Codex usage data and merge numeric usage fields into one aggregate dashboard
- Inspect each connected account individually with raw API payload details

## OpenAI/Codex login flow

CodexDash now reuses the public-client OAuth/PKCE shape found in [`darvell/codex-pool`](https://github.com/darvell/codex-pool), but wraps it in an app-native flow:

1. The user clicks **Connect OpenAI account**.
2. CodexDash API creates a short-lived PKCE login attempt.
3. The web app opens the OpenAI authorization page in a popup.
4. After successful login, OpenAI redirects back to the local callback bridge at `http://localhost:1455/auth/callback`.
5. The callback bridge exchanges the authorization code for tokens, encrypts the session JSON in SQLite, and posts the result back to the main app window.
6. If the callback bridge is unavailable, the user can copy the final `localhost:1455` URL from the browser address bar and paste it back into CodexDash to finish the same login attempt manually.
7. CodexDash refreshes usage using the saved OAuth session and shows both the aggregate view and per-account details.

### Important local-dev note

This flow works best when the local callback bridge is reachable on `localhost:1455`, but CodexDash now also supports a manual fallback where the user pastes the final callback URL if that port is unavailable. In local development, make sure that port is free if you want the automatic popup completion path.

## Local development

```bash
bun install
cd apps/api && DATABASE_URL=file:./dev.db bunx prisma db push --accept-data-loss
cd ../..
bun run dev:api
bun run dev:web -- --host 0.0.0.0
```

## Docker image

The production image uses a multi-stage build:
- `bun install` + frontend build in the builder stage
- `bun build --compile` to emit a single API executable at `apps/api/dist/codexdash`
- the Prisma query engine shared library copied alongside the binary so the compiled app can still talk to SQLite
- the container auto-bootstraps the SQLite schema for fresh `file:` databases before Prisma connects
- a distroless non-root runtime image that only contains the compiled binary, Prisma engine library, and the built web assets

Build the image:

```bash
docker build -t codexdash:latest .
```

Run it:

```bash
docker run --rm \
  -p 3001:3001 \
  -p 1455:1455 \
  -e JWT_SECRET=replace-me \
  -e ENCRYPTION_SECRET=replace-with-32-plus-chars \
  -e DATABASE_URL=file:/data/codexdash.db \
  -e CODEXDASH_FRONTEND_ORIGIN=http://localhost:3001 \
  -e CODEX_OAUTH_REDIRECT_URI=http://localhost:1455/auth/callback \
  -v codexdash-data:/data \
  codexdash:latest
```

Notes:
- The container serves the built React app from the same process on port `3001`.
- The bundled frontend now defaults to the browser's current origin for API calls, so the production image can be deployed behind any host name without rebuilding the web bundle.
- `VITE_API_BASE_URL` is now optional and mainly useful for local development when Vite runs on a different origin than the API.
- `CODEX_OAUTH_CALLBACK_BIND_HOST=0.0.0.0` keeps the callback bridge reachable through Docker port publishing while the public redirect URL can still stay on `localhost:1455`.
- Fresh SQLite `file:` databases are initialized automatically on first boot, so a brand-new named volume can be used without running `prisma db push` inside the container.
- The image pre-creates writable `/data` and `/home/processor/codexdash` directories for non-root volume mounts, matching both the README example and the `processor` host-user bind/volume pattern.
- If the callback bridge is still unreachable in your setup, the manual callback URL paste fallback remains available.

## Environment variables

### Root `.env`

```env
JWT_SECRET=replace-me
ENCRYPTION_SECRET=replace-with-at-least-32-characters
DATABASE_URL=file:./dev.db
CODEXDASH_FRONTEND_ORIGIN=http://localhost:5173
CODEX_OAUTH_REDIRECT_URI=http://localhost:1455/auth/callback
# Optional in local dev when the web app does not share the API origin.
VITE_API_BASE_URL=http://localhost:3001
```

## Verification

```bash
bun run lint
bun run test
bun run build
curl http://localhost:3001/health
```

## API overview

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /codex/accounts`
- `POST /codex/accounts/login/start`
- `GET /codex/accounts/login/attempts/:attemptId`
- `DELETE /codex/accounts/login/attempts/:attemptId`
- `GET /codex/accounts/login/callback`
- `GET /codex/accounts`
- `DELETE /codex/accounts/:accountId`
- `GET /codex/usage-summary`
