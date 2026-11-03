import { getJson, postJson } from './http.ts';

export type Account = { user: string; username: string; provider: 'GOOGLE' | 'COMMONS' };
export type CurrentAccount = { account: Account | null; pending: boolean };
export type RegistrationResult = { user: string; username: string; redirectTo: string };
export type DeleteEligibility = { eligible: true } | {
  eligible: false; error: 'HUBS_OWNED'; message: string;
};

export class AccountRequestError extends Error {
  constructor(readonly code: string, message = code) {
    super(message);
    this.name = 'AccountRequestError';
  }
}

async function deleteAccount(): Promise<{ deleted: true }> {
  const response = await fetch('/api/accounts/delete', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  let body: { deleted?: boolean; error?: string; message?: string } = {};
  try { body = await response.json() as typeof body; } catch { /* Use the request fallback below. */ }
  if (!response.ok || body.error) {
    const code = body.error ?? 'REQUEST_FAILED';
    throw new AccountRequestError(code, body.message ?? code);
  }
  if (body.deleted !== true) throw new AccountRequestError('INVALID_RESPONSE');
  return { deleted: true };
}

async function checkDeleteEligibility(): Promise<DeleteEligibility> {
  const response = await fetch('/api/accounts/delete-eligibility', { credentials: 'same-origin' });
  let body: { eligible?: boolean; error?: string; message?: string } = {};
  try { body = await response.json() as typeof body; } catch { /* Use the request fallback below. */ }
  if (!response.ok) {
    const code = body.error ?? 'REQUEST_FAILED';
    throw new AccountRequestError(code, body.message ?? code);
  }
  if (body.eligible === true) return { eligible: true };
  if (body.eligible === false && body.error === 'HUBS_OWNED' && body.message) {
    return { eligible: false, error: 'HUBS_OWNED', message: body.message };
  }
  if (body.error) throw new AccountRequestError(body.error, body.message ?? body.error);
  throw new AccountRequestError('INVALID_RESPONSE');
}

export const AccountsApi = {
  current: () => getJson<CurrentAccount>('/api/accounts/current'),
  loginUrl(provider: Account['provider'], returnTo: string) {
    return `/api/accounts/login?${new URLSearchParams({ provider, returnTo })}`;
  },
  register: (username: string) => postJson<RegistrationResult>('/accounts/register', { username }),
  logout: () => postJson<{ ended: boolean }>('/accounts/logout'),
  setUsername: (username: string) => postJson<{ user: string; username: string }>('/accounts/set-username', { username }),
  checkDeleteEligibility,
  delete: deleteAccount,
};
