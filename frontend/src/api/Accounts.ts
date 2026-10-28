import { getJson, postJson } from './http.ts';

export type Account = { user: string; username: string; provider: 'GOOGLE' | 'COMMONS' };
export type CurrentAccount = { account: Account | null; pending: boolean };
export type RegistrationResult = { user: string; username: string; redirectTo: string };

export const AccountsApi = {
  current: () => getJson<CurrentAccount>('/api/accounts/current'),
  loginUrl(provider: Account['provider'], returnTo: string) {
    return `/api/accounts/login?${new URLSearchParams({ provider, returnTo })}`;
  },
  register: (username: string) => postJson<RegistrationResult>('/accounts/register', { username }),
  logout: () => postJson<{ ended: boolean }>('/accounts/logout'),
  setUsername: (username: string) => postJson<{ user: string; username: string }>('/accounts/set-username', { username }),
};
