export type AuthResponse = {
  token: string;
  user: UserProfile;
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type CodexUsagePayload = Record<string, unknown>;

export type ConnectedAccountStatus = 'active' | 'error';
export type CodexAuthType = 'codex-oauth';
export type CodexLoginAttemptStatus =
  | 'pending'
  | 'completed'
  | 'error'
  | 'expired'
  | 'cancelled';

export type ConnectedAccount = {
  id: string;
  label: string;
  emailHint: string | null;
  providerEmail: string | null;
  providerAccountId: string | null;
  planType: string | null;
  authType: CodexAuthType;
  status: ConnectedAccountStatus;
  sessionExpiresAt: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  usage: CodexUsagePayload | null;
  createdAt: string;
};

export type UsageSummary = {
  aggregatedUsage: CodexUsagePayload | null;
  accounts: ConnectedAccount[];
  totals: {
    totalAccounts: number;
    activeAccounts: number;
    erroredAccounts: number;
  };
  refreshedAt: string;
};

export type StartCodexLoginInput = {
  label: string;
  emailHint?: string;
};

export type StartCodexLoginResponse = {
  attemptId: string;
  authorizeUrl: string;
  expiresAt: string;
};

export type CodexLoginAttemptResponse = {
  id: string;
  label: string;
  emailHint: string | null;
  status: CodexLoginAttemptStatus;
  expiresAt: string;
  completedAt: string | null;
  lastError: string | null;
  connectedAccount: ConnectedAccount | null;
};

export type RegisterInput = {
  email: string;
  password: string;
  name: string;
};

export type LoginInput = {
  email: string;
  password: string;
};
