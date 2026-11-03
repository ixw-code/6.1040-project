import { describe, expect, test } from 'bun:test';
import { ObjectId } from 'mongodb';
import { createReaderHttpHandler } from '@/http/edge.ts';
import type { VerifiedProvider } from '@/auth/providers.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { MediaAssetManagingConcept } from '@/concepts/MediaAssetManaging/MediaAssetManaging.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { GridFsMedia } from '@/storage/GridFsMedia.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

const origin = 'http://localhost:3000';

describe('Accounts HTTP boundary', () => {
  const mongo = useMongoTestDb();
  const provider: VerifiedProvider = {
    kind: 'GOOGLE',
    authorize({ state }) { return `https://identity.example/authorize?state=${state}`; },
    async redeem({ code }) { return code === 'approved' ? 'verified-subject' : undefined; },
  };

  function listen() {
    return Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: createReaderHttpHandler(mongo.db(), {
      origin, cookieKey: Buffer.alloc(32, 7), providers: { GOOGLE: provider },
    }) });
  }

  async function request(server: ReturnType<typeof listen>, path: string, init: RequestInit = {}) {
    return fetch(`http://127.0.0.1:${server.port}${path}`, { redirect: 'manual', ...init });
  }

  function issued(response: Response, name: string): string {
    const header = response.headers.getSetCookie().find((value) => value.startsWith(`${name}=`));
    expect(header).toBeDefined();
    return header!.split(';')[0]!;
  }

  test('requires explicit Create account after verified callback, then issues and revokes a session', async () => {
    const server = listen();
    try {
      const returnTo = '/star-harbor/Opening?from=hub';
      const start = await request(server, `/api/accounts/login?provider=GOOGLE&returnTo=${encodeURIComponent(returnTo)}`);
      expect(start.status).toBe(303);
      const flow = issued(start, '__Host-wikiplotter_flow');
      const state = new URL(start.headers.get('location')!).searchParams.get('state');
      const callback = await request(server, `/auth/google/callback?code=approved&state=${state}`, {
        headers: { cookie: flow },
      });
      expect(callback.status).toBe(303);
      expect(callback.headers.get('location')).toBe(`${origin}/register?returnTo=${encodeURIComponent(returnTo)}`);
      const pending = issued(callback, '__Host-wikiplotter_pending');
      expect(await mongo.db().collection('registering.users').countDocuments()).toBe(0);
      expect(await (await request(server, '/api/accounts/current', { headers: { cookie: pending } })).json())
        .toEqual({ account: null, pending: true });

      const badOrigin = await request(server, '/api/accounts/register', {
        method: 'POST', headers: { origin: 'https://attacker.example', cookie: pending,
          'content-type': 'application/json' }, body: JSON.stringify({ username: 'Alice' }),
      });
      expect(badOrigin.status).toBe(403);
      expect(await mongo.db().collection('registering.users').countDocuments()).toBe(0);

      const registered = await request(server, '/api/accounts/register', {
        method: 'POST', headers: { origin, cookie: pending, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'Alice', provider: 'COMMONS', providerSubject: 'forged' }),
      });
      expect(registered.status).toBe(201);
      expect(await registered.clone().json()).toMatchObject({ redirectTo: returnTo });
      const session = issued(registered, '__Host-wikiplotter_session');
      expect(registered.headers.getSetCookie().find((value) => value.startsWith('__Host-wikiplotter_session=')))
        .toContain('Secure; HttpOnly; SameSite=Lax');
      expect(await (await request(server, '/api/accounts/current', { headers: { cookie: session } })).json())
        .toMatchObject({ account: { username: 'Alice', provider: 'GOOGLE' }, pending: false });
      expect(await mongo.db().collection('registering.users').findOne({ username: 'Alice' }))
        .toMatchObject({ provider: 'GOOGLE', providerSubject: 'verified-subject' });

      const renamed = await request(server, '/api/accounts/set-username', {
        method: 'POST', headers: { origin, cookie: session, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'Alice2', user: 'forged' }),
      });
      expect(renamed.status).toBe(200);
      expect(await renamed.json()).toMatchObject({ username: 'Alice2' });

      const again = await request(server, '/api/accounts/login?provider=GOOGLE');
      const nextFlow = issued(again, '__Host-wikiplotter_flow');
      const nextState = new URL(again.headers.get('location')!).searchParams.get('state');
      const returning = await request(server, `/auth/google/callback?code=approved&state=${nextState}`, {
        headers: { cookie: `${nextFlow}; ${session}` },
      });
      expect(returning.status).toBe(303);
      expect(returning.headers.get('location')).toBe(`${origin}/`);
      const rotated = issued(returning, '__Host-wikiplotter_session');
      expect(rotated).not.toBe(session);
      expect(await (await request(server, '/api/accounts/current', { headers: { cookie: session } })).json())
        .toEqual({ account: null, pending: false });
      expect(await (await request(server, '/api/accounts/current', { headers: { cookie: rotated } })).json())
        .toMatchObject({ account: { username: 'Alice2', provider: 'GOOGLE' } });

      const logout = await request(server, '/api/accounts/logout', {
        method: 'POST', headers: { origin, cookie: rotated },
      });
      expect(await logout.json()).toEqual({ ended: true });
      expect(await (await request(server, '/api/accounts/current', { headers: { cookie: rotated } })).json())
        .toEqual({ account: null, pending: false });
    } finally { server.stop(); }
  });

  test('rejects forged callbacks, invalid codes, and protected mutations without a session', async () => {
    const server = listen();
    try {
      const start = await request(server, '/api/accounts/login?provider=GOOGLE');
      const flow = issued(start, '__Host-wikiplotter_flow');
      expect((await request(server, '/auth/google/callback?code=approved&state=wrong', {
        headers: { cookie: flow },
      })).status).toBe(400);
      const state = new URL(start.headers.get('location')!).searchParams.get('state');
      expect((await request(server, `/auth/google/callback?code=bad&state=${state}`, {
        headers: { cookie: flow },
      })).status).toBe(401);
      expect((await request(server, '/api/accounts/set-username', {
        method: 'POST', headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'Stolen' }),
      })).status).toBe(401);
      expect((await request(server, '/api/accounts/delete', {
        method: 'POST', headers: { origin },
      })).status).toBe(401);
      expect((await request(server, '/api/accounts/delete-eligibility')).status).toBe(401);
    } finally { server.stop(); }
  });

  test('clears an expired session cookie even before MongoDB removes its row', async () => {
    const { user } = await new RegisteringConcept(mongo.db()).register({
      username: 'Expired', provider: 'GOOGLE', providerSubject: 'expired-subject',
    });
    const { session } = await new SessioningConcept(mongo.db(),
      () => new Date('2020-01-01T00:00:00.000Z')).start({ user });
    const server = listen();
    try {
      const current = await request(server, '/api/accounts/current', {
        headers: { cookie: `__Host-wikiplotter_session=${session}` },
      });
      expect(await current.json()).toEqual({ account: null, pending: false });
      expect(current.headers.getSetCookie().some((value) =>
        value.startsWith('__Host-wikiplotter_session=;') && value.includes('Max-Age=0'))).toBe(true);
    } finally { server.stop(); }
  });

  test('uses the session identity and refuses owned hubs without changing account state', async () => {
    const db = mongo.db();
    const registering = new RegisteringConcept(db);
    const sessioning = new SessioningConcept(db);
    const { user: owner } = await registering.register({
      username: 'Owner', provider: 'GOOGLE', providerSubject: 'owner-subject',
    });
    const { session: ownerSession } = await sessioning.start({ user: owner });
    await new HubCataloguingConcept(db).create({ name: 'Owner Hub', creator: owner });
    const { user: caller } = await registering.register({
      username: 'Caller', provider: 'COMMONS', providerSubject: 'caller-subject',
    });
    const { session: callerSession } = await sessioning.start({ user: caller });
    const server = listen();
    try {
      const eligible = await request(server, '/api/accounts/delete-eligibility', {
        headers: { cookie: `__Host-wikiplotter_session=${callerSession}` },
      });
      expect(eligible.status).toBe(200);
      expect(await eligible.json()).toEqual({ eligible: true });

      const forged = await request(server, '/api/accounts/delete', {
        method: 'POST', headers: { origin, cookie: `__Host-wikiplotter_session=${callerSession}`,
          'content-type': 'application/json' }, body: JSON.stringify({ user: owner }),
      });
      expect(forged.status).toBe(200);
      expect(await forged.json()).toEqual({ deleted: true });
      expect(forged.headers.getSetCookie().some((value) =>
        value.startsWith('__Host-wikiplotter_session=;') && value.includes('Max-Age=0'))).toBe(true);
      expect(await registering._user({ user: owner })).toHaveLength(1);
      expect(await registering._user({ user: caller })).toEqual([]);
      await expect(sessioning.use({ session: callerSession })).rejects.toBeTruthy();

      const blockerFirst = await request(server, '/api/accounts/delete-eligibility', {
        headers: { cookie: `__Host-wikiplotter_session=${ownerSession}` },
      });
      expect(blockerFirst.status).toBe(200);
      expect(await blockerFirst.json()).toEqual({ eligible: false, error: 'HUBS_OWNED',
        message: 'Unable to proceed with account deletion. Please resolve the hubs that you currently own first.' });
      const blocked = await request(server, '/api/accounts/delete', {
        method: 'POST', headers: { origin, cookie: `__Host-wikiplotter_session=${ownerSession}`,
          'content-type': 'application/json' }, body: JSON.stringify({ user: caller }),
      });
      expect(blocked.status).toBe(409);
      expect(await blocked.json()).toEqual({ error: 'HUBS_OWNED',
        message: 'Unable to proceed with account deletion. Please resolve the hubs that you currently own first.' });
      expect(await registering._user({ user: owner })).toHaveLength(1);
      expect(await sessioning.use({ session: ownerSession })).toEqual({ user: owner });
    } finally { server.stop(); }
  });

  test('recovers interrupted deletion before serving account requests and permits fresh registration afterward', async () => {
    const db = mongo.db();
    const registering = new RegisteringConcept(db);
    const sessioning = new SessioningConcept(db);
    const progress = new ProgressRecordingConcept(db);
    const assets = new MediaAssetManagingConcept(db);
    const store = new GridFsMedia(db);
    const { user } = await registering.register({
      username: 'Reader', provider: 'GOOGLE', providerSubject: 'verified-subject',
    });
    const { session } = await sessioning.start({ user });
    await progress.record({ scope: 'hub-1', reader: user, checkpoint: 'checkpoint-1' });
    const storageKey = new ObjectId().toHexString();
    const { asset } = await assets.create({
      uploader: user, filename: 'referenced.png', storageKey, kind: 'IMAGE',
    });
    await store.put(storageKey, Buffer.from('referenced media'));
    const article = { _id: 'retained-article', scope: 'hub-1', title: 'Retained',
      blocks: [{ _id: 'image-block', kind: 'IMAGE', body: asset, alt: 'image' }] };
    const documents = db.collection<typeof article>('documents');
    await documents.insertOne(article);

    const originalDelete = GridFsMedia.prototype.delete;
    let deleteAttempts = 0;
    GridFsMedia.prototype.delete = async function (key: string) {
      deleteAttempts += 1;
      if (deleteAttempts <= 2) throw new Error('injected storage failure');
      return originalDelete.call(this, key);
    };
    const server = listen();
    try {
      const interrupted = await request(server, '/api/accounts/delete', {
        method: 'POST', headers: { origin, cookie: `__Host-wikiplotter_session=${session}` },
      });
      expect(interrupted.status).toBe(503);
      expect(await interrupted.json()).toMatchObject({ error: 'RECOVERY_PENDING' });
      expect(await registering._user({ user })).toEqual([]);
      expect(await db.collection('wikiplotter_operations').countDocuments({ kind: 'account.delete' })).toBe(1);

      const current = await request(server, '/api/accounts/current', {
        headers: { cookie: `__Host-wikiplotter_session=${session}` },
      });
      expect(current.status).toBe(200);
      expect(await current.json()).toEqual({ account: null, pending: false });
      expect(deleteAttempts).toBe(3);
      expect(await db.collection('wikiplotter_operations').countDocuments({ kind: 'account.delete' })).toBe(0);
      expect(await progress._scopesForReader({ reader: user })).toEqual([]);
      expect(await assets._get({ asset })).toEqual([]);
      expect(await store.get(storageKey)).toBeUndefined();
      expect(await documents.findOne({ _id: article._id })).toEqual(article);

      const start = await request(server, '/api/accounts/login?provider=GOOGLE');
      const flow = issued(start, '__Host-wikiplotter_flow');
      const state = new URL(start.headers.get('location')!).searchParams.get('state');
      const callback = await request(server, `/auth/google/callback?code=approved&state=${state}`, {
        headers: { cookie: flow },
      });
      expect(callback.status).toBe(303);
      expect(callback.headers.get('location')).toBe(`${origin}/register?returnTo=%2F`);
      const pending = issued(callback, '__Host-wikiplotter_pending');
      const registered = await request(server, '/api/accounts/register', {
        method: 'POST', headers: { origin, cookie: pending, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'Reader2' }),
      });
      expect(registered.status).toBe(201);
      expect(await registering._byProvider({ provider: 'GOOGLE', providerSubject: 'verified-subject' }))
        .not.toEqual([{ user }]);
    } finally {
      GridFsMedia.prototype.delete = originalDelete;
      server.stop();
    }
  });
});
