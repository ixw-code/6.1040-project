import { describe, expect, test } from 'bun:test';
import { createAccounts } from '@/accounts.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

describe('Accounts local composition', () => {
  const mongo = useMongoTestDb();

  test('registers only through explicit Register, then logs in and resolves the current user', async () => {
    const { gateway } = createAccounts(mongo.db());
    const newIdentity = await gateway.invoke('/accounts/login', {
      provider: 'GOOGLE', providerSubject: 'subject-1',
    });
    expect(newIdentity).toMatchObject({ ok: false, error: { kind: 'domain', value: 'ACCOUNT_NOT_FOUND' } });
    expect(await mongo.db().collection('registering.users').countDocuments()).toBe(0);

    const created = await gateway.invoke('/accounts/register', {
      username: 'Alice', provider: 'GOOGLE', providerSubject: 'subject-1',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { user, session } = created.value as { user: string; session: string };
    expect(await gateway.invoke('/accounts/current', { session })).toMatchObject({
      ok: true, value: { user, username: 'Alice', provider: 'GOOGLE' },
    });
    expect(await gateway.invoke('/accounts/set-username', { session, username: 'Alice2' }))
      .toMatchObject({ ok: true, value: { user, username: 'Alice2' } });
    const again = await gateway.invoke('/accounts/login', {
      provider: 'GOOGLE', providerSubject: 'subject-1',
    });
    expect(again).toMatchObject({ ok: true, value: { user } });
    expect(await gateway.invoke('/accounts/logout', { session }))
      .toMatchObject({ ok: true, value: { ended: true } });
    expect((await gateway.invoke('/accounts/current', { session })).ok).toBe(false);
  });
});
