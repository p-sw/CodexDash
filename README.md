# CodexDash

CodexDash is a mobile-first dashboard for monitoring multiple OpenAI Codex accounts from one place.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui-style components
- **Backend:** NestJS
- **Database:** Prisma + SQLite
- **Auth:** CodexDash email/password auth with JWT

## What it does

- Create a CodexDash account and sign in
- Connect multiple OpenAI Codex sessions under one CodexDash account
- Refresh `https://chatgpt.com/backend-api/api/codex/usage` for each connected OpenAI account
- Merge numeric usage fields into one aggregate dashboard
- Inspect each connected account individually with raw API payload details

## Important note about "OpenAI Codex login"

OpenAI does not expose a simple third-party OAuth flow for this usage endpoint.

This MVP implements OpenAI account connection as a **session-based login flow**:

1. Sign in to `chatgpt.com` in your browser
2. Copy the authenticated `Cookie` header
3. Paste it into the **Connect OpenAI account** dialog in CodexDash

The backend encrypts the cookie header before storing it in SQLite.

## Local development

```bash
pnpm install
pnpm --filter @codexdash/api exec prisma generate
cd apps/api && DATABASE_URL=file:./dev.db pnpm exec prisma db push
cd ../..
pnpm --filter @codexdash/api start:dev
pnpm --filter @codexdash/web dev --host 0.0.0.0
```

## Environment variables

### `apps/api/.env`

```env
JWT_SECRET=dev-jwt-secret-for-codexdash
ENCRYPTION_SECRET=dev-encryption-secret-for-codexdash-32chars
DATABASE_URL=file:./dev.db
```

### `apps/web/.env`

```env
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
- `POST /codex/accounts`
- `DELETE /codex/accounts/:accountId`
- `GET /codex/usage-summary`
