import { createHash } from 'node:crypto';

export const CODEX_OAUTH_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
export const CODEX_OAUTH_AUTHORIZE_URL =
  'https://auth.openai.com/oauth/authorize';
export const CODEX_OAUTH_TOKEN_URL = 'https://auth.openai.com/oauth/token';
export const CODEX_OAUTH_DEFAULT_REDIRECT_URI =
  'http://localhost:1455/auth/callback';

export type CodexIdentity = {
  email: string | null;
  accountId: string | null;
  planType: string | null;
  expiresAt: Date | null;
};

export function createPkcePair(bytes: Uint8Array) {
  const verifier = Buffer.from(bytes).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  return { verifier, challenge };
}

export function buildCodexAuthorizeUrl(input: {
  state: string;
  codeChallenge: string;
  redirectUri?: string;
}) {
  const url = new URL(CODEX_OAUTH_AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CODEX_OAUTH_CLIENT_ID);
  url.searchParams.set(
    'redirect_uri',
    input.redirectUri ?? CODEX_OAUTH_DEFAULT_REDIRECT_URI,
  );
  url.searchParams.set('scope', 'openid profile email offline_access');
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('id_token_add_organizations', 'true');
  url.searchParams.set('codex_cli_simplified_flow', 'true');
  url.searchParams.set('state', input.state);
  url.searchParams.set('originator', 'codex_cli_rs');

  return url.toString();
}

export function extractCodexIdentity(idToken: string): CodexIdentity {
  const payload = parseJwtPayload(idToken);
  if (!payload) {
    return {
      email: null,
      accountId: null,
      planType: null,
      expiresAt: null,
    };
  }

  const authClaim = readRecord(payload['https://api.openai.com/auth']);
  const profileClaim = readRecord(payload['https://api.openai.com/profile']);
  const email =
    readString(profileClaim?.email) ?? readString(payload.email) ?? null;
  const accountId =
    readString(authClaim?.chatgpt_account_id) ??
    readString(payload.chatgpt_account_id) ??
    null;
  const planType =
    readString(authClaim?.chatgpt_plan_type) ??
    readString(payload.chatgpt_plan_type) ??
    null;
  const exp = readNumber(payload.exp);

  return {
    email,
    accountId,
    planType,
    expiresAt: exp ? new Date(exp * 1000) : null,
  };
}

export function renderCodexOauthCallbackHtml(input: {
  attemptId: string;
  status: 'success' | 'error';
  frontendOrigin: string;
  message: string;
}) {
  const payload = JSON.stringify({
    type: 'codexdash:oauth-complete',
    attemptId: input.attemptId,
    status: input.status,
    message: input.message,
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CodexDash login</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #020617;
        color: #e2e8f0;
        font-family: Inter, system-ui, sans-serif;
      }
      main {
        width: min(92vw, 420px);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 24px;
        padding: 24px;
        background: rgba(15, 23, 42, 0.92);
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.35);
      }
      h1 { margin: 0 0 8px; font-size: 1.25rem; }
      p { margin: 0; line-height: 1.6; color: #cbd5e1; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(input.status === 'success' ? 'Connected to CodexDash' : 'CodexDash login failed')}</h1>
      <p>${escapeHtml(input.message)}</p>
    </main>
    <script>
      const payload = ${payload};
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, ${JSON.stringify(input.frontendOrigin)});
          window.close();
        }
      } catch (error) {
        console.error(error);
      }
    </script>
  </body>
</html>`;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
