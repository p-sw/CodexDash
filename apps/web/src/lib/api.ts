import type {
  AuthResponse,
  CodexLoginAttemptResponse,
  CompleteCodexManualLoginInput,
  ConnectedAccount,
  LoginInput,
  RegisterInput,
  StartCodexLoginInput,
  StartCodexLoginResponse,
  UsageSummary,
  UserProfile,
} from '@codexdash/shared-types';
import { clearToken, getToken } from './storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    clearToken();
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

export const api = {
  register: (input: RegisterInput) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  login: (input: LoginInput) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  me: () => request<UserProfile>('/auth/me'),
  getUsageSummary: (refresh = true) =>
    request<UsageSummary>(`/codex/usage-summary?refresh=${refresh}`),
  startCodexLogin: (input: StartCodexLoginInput) =>
    request<StartCodexLoginResponse>('/codex/accounts/login/start', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getCodexLoginAttempt: (attemptId: string) =>
    request<CodexLoginAttemptResponse>(`/codex/accounts/login/${attemptId}`),
  completeCodexManualLogin: (
    attemptId: string,
    input: CompleteCodexManualLoginInput,
  ) =>
    request<CodexLoginAttemptResponse>(
      `/codex/accounts/login/${attemptId}/manual-complete`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),
  cancelCodexLoginAttempt: (attemptId: string) =>
    request<{ ok: boolean }>(`/codex/accounts/login/${attemptId}/cancel`, {
      method: 'POST',
    }),
  deleteAccount: (accountId: string) =>
    request<{ ok: boolean }>(`/codex/accounts/${accountId}`, {
      method: 'DELETE',
    }),
  listAccounts: () => request<ConnectedAccount[]>('/codex/accounts'),
};
