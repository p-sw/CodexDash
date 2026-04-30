import {
  buildCodexAuthorizeUrl,
  createPkcePair,
  extractCodexIdentity,
  parseCodexCallbackParams,
  renderCodexOauthCallbackHtml,
} from './codex-oauth';

describe('codex-oauth helpers', () => {
  it('builds the OpenAI authorize URL with Codex-specific PKCE parameters', () => {
    const url = new URL(
      buildCodexAuthorizeUrl({
        state: 'state-123',
        codeChallenge: 'challenge-abc',
        redirectUri: 'http://localhost:1455/auth/callback',
      }),
    );

    expect(url.origin + url.pathname).toBe(
      'https://auth.openai.com/oauth/authorize',
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe(
      'app_EMoamEEZ73f0CkXaXp7hrann',
    );
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:1455/auth/callback',
    );
    expect(url.searchParams.get('scope')).toBe(
      'openid profile email offline_access',
    );
    expect(url.searchParams.get('code_challenge')).toBe('challenge-abc');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('originator')).toBe('codex_cli_rs');
    expect(url.searchParams.get('codex_cli_simplified_flow')).toBe('true');
    expect(url.searchParams.get('id_token_add_organizations')).toBe('true');
  });

  it('creates a valid PKCE verifier/challenge pair', () => {
    const pair = createPkcePair(Buffer.alloc(32, 7));

    expect(pair.verifier).toBe('BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc');
    expect(pair.challenge).toBe('3Ev4DHdHPRMPoN6GukAY_pi7IUAF5qWJHRK6kURvnoE');
  });

  it('extracts account identity fields from the id token payload', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
      'base64url',
    );
    const payload = Buffer.from(
      JSON.stringify({
        email: 'operator@example.com',
        exp: 1_800_000_000,
        'https://api.openai.com/auth': {
          chatgpt_account_id: 'acct_123',
          chatgpt_plan_type: 'pro',
        },
      }),
    ).toString('base64url');
    const token = `${header}.${payload}.signature`;

    expect(extractCodexIdentity(token)).toEqual({
      email: 'operator@example.com',
      accountId: 'acct_123',
      planType: 'pro',
      expiresAt: new Date(1_800_000_000 * 1000),
    });
  });

  it('parses a pasted localhost callback URL for manual completion', () => {
    expect(
      parseCodexCallbackParams(
        'http://localhost:1455/auth/callback?code=abc123&state=state-123',
      ),
    ).toEqual({
      code: 'abc123',
      oauthError: null,
      oauthErrorDescription: null,
      state: 'state-123',
    });
  });

  it('renders callback html that reports completion back to the frontend window', () => {
    const html = renderCodexOauthCallbackHtml({
      attemptId: 'attempt_123',
      status: 'success',
      frontendOrigin: 'http://localhost:5173',
      message: 'Connected successfully',
    });

    expect(html).toContain('codexdash:oauth-complete');
    expect(html).toContain('attempt_123');
    expect(html).toContain('Connected successfully');
    expect(html).toContain('http://localhost:5173');
  });
});
