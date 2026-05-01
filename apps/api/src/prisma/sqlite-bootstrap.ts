import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

type BunSqliteDatabase = {
  exec(sql: string): void;
  close(throwOnError?: boolean): void;
};

type BunSqliteModule = {
  Database: new (
    filename: string,
    options?: {
      create?: boolean;
      readonly?: boolean;
      strict?: boolean;
    },
  ) => BunSqliteDatabase;
};

const BUN_SQLITE_SPECIFIER = 'bun:sqlite';

const SQLITE_BOOTSTRAP_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "OpenAiAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "emailHint" TEXT,
  "providerEmail" TEXT,
  "providerAccountId" TEXT,
  "planType" TEXT,
  "authType" TEXT NOT NULL DEFAULT 'codex-oauth',
  "encryptedSessionJson" TEXT NOT NULL,
  "sessionExpiresAt" DATETIME,
  "lastValidatedAt" DATETIME,
  "lastUsageJson" JSONB,
  "lastSyncedAt" DATETIME,
  "lastError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "OpenAiAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OpenAiAccount_userId_idx" ON "OpenAiAccount"("userId");

CREATE TABLE IF NOT EXISTS "OpenAiLoginAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "accountId" TEXT,
  "label" TEXT NOT NULL,
  "emailHint" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "state" TEXT NOT NULL,
  "encryptedCodeVerifier" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "completedAt" DATETIME,
  "lastError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "OpenAiLoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OpenAiLoginAttempt_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "OpenAiAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "OpenAiLoginAttempt_state_key" ON "OpenAiLoginAttempt"("state");
CREATE INDEX IF NOT EXISTS "OpenAiLoginAttempt_userId_status_idx" ON "OpenAiLoginAttempt"("userId", "status");
`;

export function parseSqliteFilePath(
  databaseUrl: string | undefined,
): string | null {
  if (!databaseUrl || !databaseUrl.startsWith('file:')) {
    return null;
  }

  const rawPath = databaseUrl.slice('file:'.length).split('?')[0];
  if (!rawPath) {
    return null;
  }

  return decodeURIComponent(rawPath);
}

export function resolveSqliteFilePath(
  databaseUrl: string | undefined,
  cwd = process.cwd(),
): string | null {
  const parsedPath = parseSqliteFilePath(databaseUrl);
  if (!parsedPath) {
    return null;
  }

  if (isAbsolute(parsedPath)) {
    return parsedPath;
  }

  const schemaRelativeBases = [
    resolve(cwd, 'apps/api/prisma'),
    resolve(cwd, 'prisma'),
  ];
  const prismaSchemaBase = schemaRelativeBases.find((candidate) =>
    existsSync(candidate),
  );

  return prismaSchemaBase
    ? resolve(prismaSchemaBase, parsedPath)
    : resolve(cwd, parsedPath);
}

export async function ensureSqliteSchema(
  databaseUrl = process.env.DATABASE_URL,
): Promise<boolean> {
  const bunRuntime = globalThis as typeof globalThis & {
    Bun?: {
      version: string;
    };
  };

  if (!bunRuntime.Bun) {
    return false;
  }

  const databasePath = resolveSqliteFilePath(databaseUrl);
  if (!databasePath) {
    return false;
  }

  await mkdir(dirname(databasePath), { recursive: true });

  const { Database } = (await import(BUN_SQLITE_SPECIFIER)) as BunSqliteModule;
  const database = new Database(databasePath, { create: true, strict: true });

  try {
    database.exec(SQLITE_BOOTSTRAP_SQL);
  } finally {
    database.close(false);
  }

  return true;
}
