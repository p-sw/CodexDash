import { existsSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';

type ResolveWebDistDirOptions = {
  envWebDistDir?: string | null;
  execPath?: string;
  directoryExists?: (candidate: string) => boolean;
};

type SpaFallbackRequest = {
  method: string;
  path: string;
  acceptHeader?: string | null;
};

const API_PREFIXES = ['/auth', '/codex', '/health'];

export function resolveWebDistDir({
  envWebDistDir,
  execPath = process.execPath,
  directoryExists = existsSync,
}: ResolveWebDistDirOptions = {}): string | null {
  const candidates = [
    envWebDistDir,
    join(dirname(execPath), 'web'),
    join(process.cwd(), 'apps/web/dist'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (directoryExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function shouldServeSpaFallback({
  method,
  path,
  acceptHeader,
}: SpaFallbackRequest): boolean {
  if (method !== 'GET') {
    return false;
  }

  if (!(acceptHeader ?? '').includes('text/html')) {
    return false;
  }

  if (
    API_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }

  return extname(path) === '';
}

export function buildSpaFallbackPath(webDistDir: string): string {
  return join(webDistDir, 'index.html');
}

export function resolveCallbackListenHost(
  redirectHostname: string,
  bindHost = process.env.CODEX_OAUTH_CALLBACK_BIND_HOST,
): string {
  return bindHost || redirectHostname;
}
