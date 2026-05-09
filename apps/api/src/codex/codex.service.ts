import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type {
  CodexLoginAttemptResponse,
  ConnectedAccount,
  StartCodexLoginResponse,
  UsageSummary,
} from '@codexdash/shared-types';
import { decryptString, encryptString } from '../common/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StartCodexLoginDto } from './dto/start-codex-login.dto';
import {
  buildCodexAuthorizeUrl,
  CODEX_OAUTH_CLIENT_ID,
  CODEX_OAUTH_DEFAULT_REDIRECT_URI,
  CODEX_OAUTH_TOKEN_URL,
  createPkcePair,
  extractCodexIdentity,
  parseCodexCallbackParams,
  renderCodexOauthCallbackHtml,
} from './codex-oauth';
import { aggregateUsagePayloads } from './usage-aggregator';

type UsageApiResponse = Record<string, unknown>;

type StoredCodexSession = {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  accountId: string | null;
};

type CodexTokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
};

@Injectable()
export class CodexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async startAccountLogin(
    userId: string,
    dto: StartCodexLoginDto,
  ): Promise<StartCodexLoginResponse> {
    const pkce = createPkcePair(randomBytes(32));
    const state = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const attempt = await this.prisma.openAiLoginAttempt.create({
      data: {
        userId,
        label: dto.label.trim(),
        emailHint: dto.emailHint?.trim() || null,
        state,
        encryptedCodeVerifier: encryptString(
          pkce.verifier,
          this.getEncryptionSecret(),
        ),
        expiresAt,
      },
    });

    return {
      attemptId: attempt.id,
      authorizeUrl: buildCodexAuthorizeUrl({
        state,
        codeChallenge: pkce.challenge,
        redirectUri: this.getOauthRedirectUri(),
      }),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getLoginAttempt(
    userId: string,
    attemptId: string,
  ): Promise<CodexLoginAttemptResponse> {
    const attempt = await this.prisma.openAiLoginAttempt.findFirst({
      where: { id: attemptId, userId },
      include: { account: true },
    });
    if (!attempt) {
      throw new NotFoundException('Login attempt not found');
    }

    if (
      attempt.status === 'pending' &&
      attempt.expiresAt.getTime() < Date.now()
    ) {
      const expired = await this.prisma.openAiLoginAttempt.update({
        where: { id: attempt.id },
        data: { status: 'expired', lastError: 'Login window expired.' },
        include: { account: true },
      });
      return this.toLoginAttemptView(expired);
    }

    return this.toLoginAttemptView(attempt);
  }

  async completeManualLoginAttempt(
    userId: string,
    attemptId: string,
    rawUrl: string,
  ) {
    const attempt = await this.prisma.openAiLoginAttempt.findFirst({
      where: { id: attemptId, userId },
    });
    if (!attempt) {
      throw new NotFoundException('Login attempt not found');
    }

    const params = parseCodexCallbackParams(rawUrl, this.getOauthRedirectUri());
    if (!params.state) {
      throw new BadRequestException(
        'Missing OAuth state in the pasted callback URL.',
      );
    }
    if (params.state !== attempt.state) {
      throw new BadRequestException(
        'This callback URL belongs to a different login attempt.',
      );
    }

    await this.completeOauthAttempt(attempt, params);
    return this.getLoginAttempt(userId, attemptId);
  }

  async cancelLoginAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.openAiLoginAttempt.findFirst({
      where: { id: attemptId, userId },
    });
    if (!attempt) {
      throw new NotFoundException('Login attempt not found');
    }

    if (attempt.status !== 'pending') {
      return { ok: true };
    }

    await this.prisma.openAiLoginAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'cancelled',
        lastError: 'Login cancelled by user.',
      },
    });

    return { ok: true };
  }

  async listAccounts(userId: string) {
    const accounts = await this.prisma.openAiAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((account) => this.toAccountView(account));
  }

  async deleteAccount(userId: string, accountId: string) {
    const account = await this.prisma.openAiAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }

    await this.prisma.openAiLoginAttempt.updateMany({
      where: { accountId },
      data: { accountId: null },
    });
    await this.prisma.openAiAccount.delete({ where: { id: accountId } });
    return { ok: true };
  }

  async getUsageSummary(userId: string, refresh = true): Promise<UsageSummary> {
    const accounts = await this.prisma.openAiAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const resolvedAccounts = await Promise.all(
      accounts.map(async (account) => {
        if (!refresh) {
          return account;
        }

        try {
          const updated = await this.refreshAccountUsage(account);
          return updated;
        } catch (error) {
          return this.prisma.openAiAccount.update({
            where: { id: account.id },
            data: {
              lastError:
                error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      }),
    );

    const accountViews = resolvedAccounts.map((account) =>
      this.toAccountView(account),
    );

    return {
      aggregatedUsage: aggregateUsagePayloads(
        accountViews.map((account) => account.usage),
      ),
      accounts: accountViews,
      totals: {
        totalAccounts: accountViews.length,
        activeAccounts: accountViews.filter(
          (account) => account.status === 'active',
        ).length,
        erroredAccounts: accountViews.filter(
          (account) => account.status === 'error',
        ).length,
      },
      refreshedAt: new Date().toISOString(),
    };
  }

  async handleOauthCallbackRequest(rawUrl: string) {
    const params = parseCodexCallbackParams(rawUrl, this.getOauthRedirectUri());

    if (!params.state) {
      return this.renderCallbackPage({
        attemptId: 'unknown',
        status: 'error',
        message: 'Missing OAuth state.',
      });
    }

    const attempt = await this.prisma.openAiLoginAttempt.findUnique({
      where: { state: params.state },
    });
    if (!attempt) {
      return this.renderCallbackPage({
        attemptId: 'unknown',
        status: 'error',
        message: 'This CodexDash login attempt no longer exists.',
      });
    }

    const result = await this.completeOauthAttempt(attempt, params);
    return this.renderCallbackPage(result);
  }

  private async completeOauthAttempt(
    attempt: PendingLoginAttemptRecord,
    params: ReturnType<typeof parseCodexCallbackParams>,
  ) {
    if (attempt.status !== 'pending') {
      return {
        attemptId: attempt.id,
        status: attempt.status === 'completed' ? 'success' : 'error',
        message:
          attempt.status === 'completed'
            ? 'This OpenAI account is already connected.'
            : attempt.lastError || 'This login attempt is no longer active.',
      } as const;
    }

    if (attempt.expiresAt.getTime() < Date.now()) {
      await this.prisma.openAiLoginAttempt.update({
        where: { id: attempt.id },
        data: { status: 'expired', lastError: 'Login window expired.' },
      });
      return {
        attemptId: attempt.id,
        status: 'error' as const,
        message: 'This login window has expired. Please start again.',
      };
    }

    if (params.oauthError) {
      const message = params.oauthErrorDescription
        ? `${params.oauthError}: ${params.oauthErrorDescription}`
        : params.oauthError;
      await this.prisma.openAiLoginAttempt.update({
        where: { id: attempt.id },
        data: { status: 'error', lastError: message },
      });
      return {
        attemptId: attempt.id,
        status: 'error' as const,
        message,
      };
    }

    if (!params.code) {
      await this.prisma.openAiLoginAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'error',
          lastError: 'Missing authorization code from OpenAI.',
        },
      });
      return {
        attemptId: attempt.id,
        status: 'error' as const,
        message: 'Missing authorization code from OpenAI.',
      };
    }

    try {
      const verifier = decryptString(
        attempt.encryptedCodeVerifier,
        this.getEncryptionSecret(),
      );
      const tokenResponse = await this.exchangeAuthorizationCode(
        params.code,
        verifier,
      );
      const identity = extractCodexIdentity(tokenResponse.id_token ?? '');
      let session: StoredCodexSession = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? '',
        idToken: tokenResponse.id_token ?? '',
        accountId: identity.accountId,
      };
      const usage = await this.fetchUsageWithSession(session);
      session = usage.session;

      const sessionIdentity = extractCodexIdentity(session.idToken);
      const existing = sessionIdentity.accountId
        ? await this.prisma.openAiAccount.findFirst({
            where: {
              userId: attempt.userId,
              providerAccountId: sessionIdentity.accountId,
            },
          })
        : null;

      const account = existing
        ? await this.prisma.openAiAccount.update({
            where: { id: existing.id },
            data: {
              label: attempt.label,
              emailHint: attempt.emailHint,
              providerEmail: sessionIdentity.email,
              providerAccountId: sessionIdentity.accountId,
              planType: sessionIdentity.planType,
              encryptedSessionJson: encryptString(
                JSON.stringify(session),
                this.getEncryptionSecret(),
              ),
              sessionExpiresAt: sessionIdentity.expiresAt,
              lastValidatedAt: new Date(),
              lastUsageJson: usage.payload as Prisma.InputJsonValue,
              lastSyncedAt: new Date(),
              lastError: null,
            },
          })
        : await this.prisma.openAiAccount.create({
            data: {
              userId: attempt.userId,
              label: attempt.label,
              emailHint: attempt.emailHint,
              providerEmail: sessionIdentity.email,
              providerAccountId: sessionIdentity.accountId,
              planType: sessionIdentity.planType,
              authType: 'codex-oauth',
              encryptedSessionJson: encryptString(
                JSON.stringify(session),
                this.getEncryptionSecret(),
              ),
              sessionExpiresAt: sessionIdentity.expiresAt,
              lastValidatedAt: new Date(),
              lastUsageJson: usage.payload as Prisma.InputJsonValue,
              lastSyncedAt: new Date(),
            },
          });

      await this.prisma.openAiLoginAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          lastError: null,
          accountId: account.id,
        },
      });

      return {
        attemptId: attempt.id,
        status: 'success' as const,
        message: `Connected ${sessionIdentity.email ?? attempt.label} to CodexDash.`,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'OpenAI login failed.';
      await this.prisma.openAiLoginAttempt.update({
        where: { id: attempt.id },
        data: { status: 'error', lastError: message },
      });
      return {
        attemptId: attempt.id,
        status: 'error' as const,
        message,
      };
    }
  }

  private async refreshAccountUsage(account: OpenAiAccountRecord) {
    let session = this.readStoredSession(account.encryptedSessionJson);

    if (
      account.sessionExpiresAt &&
      account.sessionExpiresAt.getTime() - Date.now() < 2 * 60 * 1000 &&
      session.refreshToken
    ) {
      session = await this.refreshStoredSession(session);
    }

    const usage = await this.fetchUsageWithSession(session);
    session = usage.session;
    const identity = extractCodexIdentity(session.idToken);

    return this.prisma.openAiAccount.update({
      where: { id: account.id },
      data: {
        providerEmail: identity.email,
        providerAccountId: identity.accountId,
        planType: identity.planType,
        encryptedSessionJson: encryptString(
          JSON.stringify(session),
          this.getEncryptionSecret(),
        ),
        sessionExpiresAt: identity.expiresAt,
        lastValidatedAt: new Date(),
        lastUsageJson: usage.payload as Prisma.InputJsonValue,
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });
  }

  private async fetchUsageWithSession(
    session: StoredCodexSession,
    allowRefresh = true,
  ): Promise<{ payload: UsageApiResponse; session: StoredCodexSession }> {
    const urls = [
      'https://chatgpt.com/backend-api/api/codex/usage',
      'https://chatgpt.com/backend-api/wham/usage',
    ];
    const errors: string[] = [];

    for (const url of urls) {
      const response = await fetch(url, {
        headers: this.buildUsageHeaders(session),
      });

      if (response.ok) {
        return {
          payload: (await response.json()) as UsageApiResponse,
          session,
        };
      }

      if (
        (response.status === 401 || response.status === 403) &&
        allowRefresh &&
        session.refreshToken
      ) {
        const refreshed = await this.refreshStoredSession(session);
        return this.fetchUsageWithSession(refreshed, false);
      }

      errors.push(`${url} -> ${response.status}`);
    }

    throw new BadRequestException(
      `Codex usage request failed (${errors.join(', ')})`,
    );
  }

  private async exchangeAuthorizationCode(code: string, verifier: string) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CODEX_OAUTH_CLIENT_ID,
      code,
      redirect_uri: this.getOauthRedirectUri(),
      code_verifier: verifier,
    });

    const response = await fetch(CODEX_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(
        `OpenAI token exchange failed (${response.status}): ${error || 'No details returned.'}`,
      );
    }

    const payload = (await response.json()) as CodexTokenResponse;
    if (!payload.access_token) {
      throw new BadRequestException(
        'OpenAI token exchange returned an empty access token.',
      );
    }

    return payload;
  }

  private async refreshStoredSession(session: StoredCodexSession) {
    const response = await fetch(CODEX_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: CODEX_OAUTH_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
        scope: 'openid profile email',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(
        `OpenAI token refresh failed (${response.status}): ${error || 'No details returned.'}`,
      );
    }

    const payload = (await response.json()) as CodexTokenResponse;
    if (!payload.access_token) {
      throw new BadRequestException(
        'OpenAI token refresh returned an empty access token.',
      );
    }

    const nextSession: StoredCodexSession = {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? session.refreshToken,
      idToken: payload.id_token ?? session.idToken,
      accountId:
        extractCodexIdentity(payload.id_token ?? session.idToken).accountId ??
        session.accountId,
    };

    return nextSession;
  }

  private buildUsageHeaders(
    session: StoredCodexSession,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      authorization: `Bearer ${session.accessToken}`,
      'user-agent': 'CodexDash/0.2',
      originator: 'codex_cli_rs',
    };

    if (session.accountId) {
      headers['ChatGPT-Account-ID'] = session.accountId;
    }

    return headers;
  }

  private readStoredSession(encryptedSessionJson: string): StoredCodexSession {
    return JSON.parse(
      decryptString(encryptedSessionJson, this.getEncryptionSecret()),
    ) as StoredCodexSession;
  }

  private renderCallbackPage(input: {
    attemptId: string;
    status: 'success' | 'error';
    message: string;
  }) {
    return {
      statusCode: input.status === 'success' ? 200 : 400,
      html: renderCodexOauthCallbackHtml({
        attemptId: input.attemptId,
        status: input.status,
        message: input.message,
        frontendOrigin: this.getFrontendOrigin(),
      }),
    };
  }

  private getEncryptionSecret() {
    return (
      this.configService.get<string>('ENCRYPTION_SECRET') ??
      'change-me-32-characters-minimum'
    );
  }

  private getFrontendOrigin() {
    return (
      this.configService.get<string>('CODEXDASH_FRONTEND_ORIGIN') ??
      'http://localhost:5173'
    );
  }

  private getOauthRedirectUri() {
    return (
      this.configService.get<string>('CODEX_OAUTH_REDIRECT_URI') ??
      CODEX_OAUTH_DEFAULT_REDIRECT_URI
    );
  }

  private toLoginAttemptView(
    attempt: LoginAttemptRecord,
  ): CodexLoginAttemptResponse {
    return {
      id: attempt.id,
      label: attempt.label,
      emailHint: attempt.emailHint,
      status: attempt.status as CodexLoginAttemptResponse['status'],
      expiresAt: attempt.expiresAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString() ?? null,
      lastError: attempt.lastError,
      connectedAccount: attempt.account
        ? this.toAccountView(attempt.account)
        : null,
    };
  }

  private toAccountView(account: AccountRecord): ConnectedAccount {
    return {
      id: account.id,
      label: account.label,
      emailHint: account.emailHint,
      providerEmail: account.providerEmail,
      providerAccountId: account.providerAccountId,
      planType: account.planType,
      authType: 'codex-oauth',
      status: account.lastError ? 'error' : 'active',
      sessionExpiresAt: account.sessionExpiresAt?.toISOString() ?? null,
      lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
      lastError: account.lastError,
      usage: (account.lastUsageJson as Record<string, unknown> | null) ?? null,
      createdAt: account.createdAt.toISOString(),
    };
  }
}

type AccountRecord = {
  id: string;
  label: string;
  emailHint: string | null;
  providerEmail: string | null;
  providerAccountId: string | null;
  planType: string | null;
  encryptedSessionJson: string;
  sessionExpiresAt: Date | null;
  lastUsageJson: unknown;
  lastSyncedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
};

type OpenAiAccountRecord = AccountRecord;

type LoginAttemptRecord = {
  id: string;
  label: string;
  emailHint: string | null;
  status: string;
  expiresAt: Date;
  completedAt: Date | null;
  lastError: string | null;
  account: AccountRecord | null;
};

type PendingLoginAttemptRecord = {
  id: string;
  userId: string;
  label: string;
  emailHint: string | null;
  status: string;
  state: string;
  encryptedCodeVerifier: string;
  expiresAt: Date;
  lastError: string | null;
};
