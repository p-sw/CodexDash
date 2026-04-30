import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { ConnectedAccount, UsageSummary } from '@codexdash/shared-types';
import { decryptString, encryptString } from '../common/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectAccountDto } from './dto/connect-account.dto';
import { aggregateUsagePayloads } from './usage-aggregator';

type UsageApiResponse = Record<string, unknown>;

@Injectable()
export class CodexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async connectAccount(
    userId: string,
    dto: ConnectAccountDto,
  ): Promise<ConnectedAccount> {
    const usage = await this.fetchUsage(dto.cookieHeader);
    const account = await this.prisma.openAiAccount.create({
      data: {
        userId,
        label: dto.label.trim(),
        emailHint: dto.emailHint?.trim() || null,
        encryptedCookie: encryptString(
          dto.cookieHeader,
          this.getEncryptionSecret(),
        ),
        lastUsageJson: usage as Prisma.InputJsonValue,
        lastSyncedAt: new Date(),
      },
    });

    return this.toAccountView(account);
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
          const usage = await this.fetchUsage(
            decryptString(account.encryptedCookie, this.getEncryptionSecret()),
          );
          return this.prisma.openAiAccount.update({
            where: { id: account.id },
            data: {
              lastUsageJson: usage as Prisma.InputJsonValue,
              lastSyncedAt: new Date(),
              lastError: null,
            },
          });
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

  private async fetchUsage(cookieHeader: string): Promise<UsageApiResponse> {
    const response = await fetch(
      'https://chatgpt.com/backend-api/api/codex/usage',
      {
        headers: {
          accept: 'application/json',
          cookie: cookieHeader,
          'user-agent': 'CodexDash/0.1 (+https://example.invalid)',
        },
      },
    );

    if (!response.ok) {
      throw new BadRequestException(
        `Codex usage request failed with status ${response.status}`,
      );
    }

    return (await response.json()) as UsageApiResponse;
  }

  private getEncryptionSecret() {
    return (
      this.configService.get<string>('ENCRYPTION_SECRET') ??
      'change-me-32-characters-minimum'
    );
  }

  private toAccountView(account: {
    id: string;
    label: string;
    emailHint: string | null;
    lastUsageJson: unknown;
    lastSyncedAt: Date | null;
    lastError: string | null;
    createdAt: Date;
  }): ConnectedAccount {
    return {
      id: account.id,
      label: account.label,
      emailHint: account.emailHint,
      status: account.lastError ? 'error' : 'active',
      lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
      lastError: account.lastError,
      usage: (account.lastUsageJson as Record<string, unknown> | null) ?? null,
      createdAt: account.createdAt.toISOString(),
    };
  }
}
