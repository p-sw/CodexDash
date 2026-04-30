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

export type ConnectedAccount = {
  id: string;
  label: string;
  emailHint: string | null;
  status: 'active' | 'error';
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

export type ConnectAccountInput = {
  label: string;
  emailHint?: string;
  cookieHeader: string;
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
