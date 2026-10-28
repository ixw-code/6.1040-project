import { describe, expect, test } from 'bun:test';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import {
  RegisteringConcept, InvalidUsername, UsernameTaken, ProviderIdentityTaken, UserNotFound,
} from '@/concepts/Registering/Registering.ts';

describe('Registering', () => {
  const mongo = useMongoTestDb();

  test('persists provider identities through rename and MongoDB reconnection', async () => {
    const accounts = new RegisteringConcept(mongo.db());
    const { user } = await accounts.register({
      username: 'Alice7', provider: 'GOOGLE', providerSubject: 'google-subject',
    });
    expect(await accounts._user({ user })).toEqual([{
      username: 'Alice7', provider: 'GOOGLE', providerSubject: 'google-subject',
    }]);
    expect(await accounts._byProvider({ provider: 'GOOGLE', providerSubject: 'google-subject' }))
      .toEqual([{ user }]);
    expect(await accounts.update({ user, username: 'Alice8' })).toEqual({ user });

    const reopened = new RegisteringConcept(await mongo.reconnect());
    expect(await reopened._user({ user })).toEqual([{
      username: 'Alice8', provider: 'GOOGLE', providerSubject: 'google-subject',
    }]);
    expect(await reopened._byProvider({ provider: 'GOOGLE', providerSubject: 'google-subject' }))
      .toEqual([{ user }]);
    expect(await reopened.unregister({ user })).toEqual({ user });
    expect(await reopened._user({ user })).toEqual([]);
    expect(await reopened._byProvider({ provider: 'GOOGLE', providerSubject: 'google-subject' }))
      .toEqual([]);
  });

  test('enforces exact username and provider uniqueness, including concurrent registrations', async () => {
    const accounts = new RegisteringConcept(mongo.db());
    await accounts.register({ username: 'Alice', provider: 'GOOGLE', providerSubject: 'same' });
    await accounts.register({ username: 'alice', provider: 'COMMONS', providerSubject: 'same' });
    await expect(accounts.register({
      username: 'Alice', provider: 'COMMONS', providerSubject: 'other',
    })).rejects.toBeInstanceOf(UsernameTaken);
    await expect(accounts.register({
      username: 'Other', provider: 'GOOGLE', providerSubject: 'same',
    })).rejects.toBeInstanceOf(ProviderIdentityTaken);
    await expect(accounts.register({
      username: 'Alice', provider: 'GOOGLE', providerSubject: 'same',
    })).rejects.toBeInstanceOf(UsernameTaken);

    const sameName = await Promise.allSettled([
      accounts.register({ username: 'Concurrent', provider: 'GOOGLE', providerSubject: 'a' }),
      accounts.register({ username: 'Concurrent', provider: 'COMMONS', providerSubject: 'b' }),
    ]);
    expect(sameName.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(sameName.filter((result) => result.status === 'rejected')[0]?.reason)
      .toBeInstanceOf(UsernameTaken);

    const sameProvider = await Promise.allSettled([
      accounts.register({ username: 'First', provider: 'GOOGLE', providerSubject: 'shared' }),
      accounts.register({ username: 'Second', provider: 'GOOGLE', providerSubject: 'shared' }),
    ]);
    expect(sameProvider.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(sameProvider.filter((result) => result.status === 'rejected')[0]?.reason)
      .toBeInstanceOf(ProviderIdentityTaken);
  });

  test('rejects invalid names and preserves account identity on failed updates', async () => {
    const accounts = new RegisteringConcept(mongo.db());
    for (const username of ['ab', 'A_B', 'a-b', 'a b', 'éclair', 'a'.repeat(21)]) {
      await expect(accounts.register({
        username, provider: 'GOOGLE', providerSubject: username,
      })).rejects.toBeInstanceOf(InvalidUsername);
    }
    const { user: alice } = await accounts.register({
      username: 'Alice', provider: 'GOOGLE', providerSubject: 'alice',
    });
    const { user: bob } = await accounts.register({
      username: 'Bob', provider: 'COMMONS', providerSubject: 'bob',
    });
    await expect(accounts.update({ user: 'missing', username: 'New' }))
      .rejects.toBeInstanceOf(UserNotFound);
    await expect(accounts.update({ user: alice, username: ' ' }))
      .rejects.toBeInstanceOf(InvalidUsername);
    await expect(accounts.update({ user: alice, username: 'Bob' }))
      .rejects.toBeInstanceOf(UsernameTaken);
    expect(await accounts.update({ user: bob, username: 'Bob' })).toEqual({ user: bob });
    expect(await accounts._user({ user: alice })).toEqual([{
      username: 'Alice', provider: 'GOOGLE', providerSubject: 'alice',
    }]);
    await expect(accounts.unregister({ user: 'missing' })).rejects.toBeInstanceOf(UserNotFound);
  });
});
