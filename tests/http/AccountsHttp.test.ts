import { describe, expect, test } from 'bun:test';
import { createReaderHttpHandler } from '@/edge.ts';
import type { VerifiedProvider } from '@/auth/providers.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
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
      const start = await request(server, '/api/accounts/login?provider=GOOGLE');
      expect(start.status).toBe(303);
      const flow = issued(start, '__Host-wikiplotter_flow');
      const state = new URL(start.headers.get('location')!).searchParams.get('state');
      const callback = await request(server, `/auth/google/callback?code=approved&state=${state}`, {
        headers: { cookie: flow },
      });
      expect(callback.status).toBe(303);
      expect(callback.headers.get('location')).toBe(`${origin}/register`);
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
      })).status).toBe(501);
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
});
