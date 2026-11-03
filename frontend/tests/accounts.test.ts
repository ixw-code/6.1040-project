import { afterEach, describe, expect, test } from 'bun:test';
import { AccountRequestError, AccountsApi } from '../src/api/Accounts.ts';
import { confirmationMatches } from '../src/features/Account/delete-account.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('account deletion UI flow', () => {
  test('requires the exact DELETE confirmation text', () => {
    expect(confirmationMatches('DELETE')).toBe(true);
    expect(confirmationMatches('delete')).toBe(false);
    expect(confirmationMatches(' DELETE')).toBe(false);
  });

  test('posts deletion without accepting a caller-supplied identity', async () => {
    let observed: RequestInit | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      observed = init;
      return Response.json({ deleted: true });
    }) as typeof fetch;

    expect(await AccountsApi.delete()).toEqual({ deleted: true });
    expect(observed?.method).toBe('POST');
    expect(observed?.credentials).toBe('same-origin');
    expect(observed?.body).toBe('{}');
  });

  test('checks deletion eligibility through a read-only request with no supplied identity', async () => {
    let observed: RequestInfo | URL | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      observed = input;
      return Response.json({ eligible: false, error: 'HUBS_OWNED', message: 'Resolve owned hubs first.' });
    }) as typeof fetch;

    expect(await AccountsApi.checkDeleteEligibility()).toEqual({
      eligible: false, error: 'HUBS_OWNED', message: 'Resolve owned hubs first.',
    });
    expect(observed).toBe('/api/accounts/delete-eligibility');
  });

  test('preserves the ownership blocker code and server message', async () => {
    globalThis.fetch = (async () => Response.json({
      error: 'HUBS_OWNED',
      message: 'Resolve your owned hubs first.',
    }, { status: 409 })) as typeof fetch;

    try {
      await AccountsApi.delete();
      throw new Error('Expected deletion to be refused');
    } catch (error) {
      expect(error).toBeInstanceOf(AccountRequestError);
      expect((error as AccountRequestError).code).toBe('HUBS_OWNED');
      expect((error as Error).message).toBe('Resolve your owned hubs first.');
    }
  });
});
