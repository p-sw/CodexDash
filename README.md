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
pnpm install
pnpm --filter @codexdash/api exec prisma generate
cd apps/api && DATABASE_URL=file:./dev.db pnpm exec prisma db push --accept-data-loss
cd ../..
pnpm --filter @codexdash/api start:dev
pnpm --filter @codexdash/web dev --host 0.0.0.0
```

## Environment variables

### Root `.env`

```env
JWT_SECRET=***
ENCRYPTION_SECRET=***
DATABASE_URL=file:./dev.db
CODEXDASH_FRONTEND_ORIGIN=http://localhost:5173
CODEX_OAUTH_REDIRECT_URI=http://localhost:1455/auth/callback
VITE_API_BASE_URL=http://localhost:3001
```

## Verification

```bash
pnpm lint
pnpm test
pnpm build
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
