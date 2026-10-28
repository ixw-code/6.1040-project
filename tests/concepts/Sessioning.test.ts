import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { SessioningConcept, SessionInvalid } from '@/concepts/Sessioning/Sessioning.ts';

describe('Sessioning', () => {
  const mongo = useMongoTestDb();

  test('persists only verifier hashes and resolves sessions after reconnection', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const sessions = new SessioningConcept(mongo.db(), () => now);
    const { session, expiresAt } = await sessions.start({ user: 'alice' });
    expect(expiresAt).toEqual(new Date('2026-01-08T00:00:00.000Z'));
    expect(session).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const rows = await mongo.db().collection('sessioning.sessions').find().toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.verifierHash).toBe(createHash('sha256').update(session).digest('hex'));
    expect(JSON.stringify(rows[0])).not.toContain(session);

    const reopened = new SessioningConcept(await mongo.reconnect(), () => now);
    expect(await reopened.use({ session })).toEqual({ user: 'alice' });
    expect(await reopened._active({ session })).toEqual([{ user: 'alice', expiresAt }]);
    await expect(reopened.use({ session: 'wrong-credential' }))
      .rejects.toBeInstanceOf(SessionInvalid);
    expect(await reopened._active({ session: 'wrong-credential' })).toEqual([]);
  });

  test('expires exactly seven days after start without renewal by use', async () => {
    let now = new Date('2026-01-01T00:00:00.000Z');
    const sessions = new SessioningConcept(mongo.db(), () => now);
    const { session, expiresAt } = await sessions.start({ user: 'alice' });
    now = new Date(expiresAt.getTime() - 1);
    expect(await sessions.use({ session })).toEqual({ user: 'alice' });
    now = expiresAt;
    await expect(sessions.use({ session })).rejects.toBeInstanceOf(SessionInvalid);
    expect(await sessions._active({ session })).toEqual([]);
    expect(await sessions.end({ session })).toEqual({ ended: true });
  });

  test('ends one session or all sessions for a user without affecting others', async () => {
    const sessions = new SessioningConcept(mongo.db());
    const first = (await sessions.start({ user: 'alice' })).session;
    const second = (await sessions.start({ user: 'alice' })).session;
    const other = (await sessions.start({ user: 'bob' })).session;
    expect(first).not.toBe(second);
    expect(await sessions.end({ session: first })).toEqual({ ended: true });
    expect(await sessions.end({ session: first })).toEqual({ ended: false });
    await expect(sessions.use({ session: first })).rejects.toBeInstanceOf(SessionInvalid);
    expect(await sessions.endUser({ user: 'alice' })).toEqual({});
    await expect(sessions.use({ session: second })).rejects.toBeInstanceOf(SessionInvalid);
    expect(await sessions.use({ session: other })).toEqual({ user: 'bob' });
    expect(await sessions.endUser({ user: 'alice' })).toEqual({});
  });
});
