import { describe, expect, test } from 'bun:test';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { createReaderHttpHandler } from '@/http/edge.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';

const origin = 'http://127.0.0.1:5174';

describe('protected Hubs HTTP boundary', () => {
  const mongo = useMongoTestDb();

  test('requires a valid cookie and origin; ignores supplied user identity', async () => {
    const db = mongo.db();
    const handle = createReaderHttpHandler(db, { origin, cookieKey: Buffer.alloc(32), providers: {} });
    const owner = (await new RegisteringConcept(db).register({
      username: 'owner', provider: 'GOOGLE', providerSubject: 'owner',
    })).user;
    const other = (await new RegisteringConcept(db).register({
      username: 'other', provider: 'GOOGLE', providerSubject: 'other',
    })).user;
    const sessions = new SessioningConcept(db);
    const ownerSession = (await sessions.start({ user: owner })).session;
    const otherSession = (await sessions.start({ user: other })).session;
    const request = (path: string, body: Record<string, unknown>, session?: string, requestOrigin = origin) =>
      new Request(`http://127.0.0.1:3001/api${path}`, { method: 'POST',
        headers: { 'content-type': 'application/json', origin: requestOrigin,
          ...(session ? { cookie: `__Host-wikiplotter_session=${session}` } : {}) },
        body: JSON.stringify(body) });

    const creation = { name: 'Star Harbor', label: 'Chapter One', user: other };
    expect((await handle(request('/hubs/create', creation))).status).toBe(401);
    expect((await handle(request('/hubs/create', creation, ownerSession, 'http://evil.test'))).status).toBe(403);
    const made = await handle(request('/hubs/create', creation, ownerSession));
    expect(made.status).toBe(200);
    const { hub } = await made.json() as { hub: string };
    expect((await new HubCataloguingConcept(db)._get({ hub }))[0]?.creator).toBe(owner);
    expect((await handle(request('/hubs/rename', { hub, name: 'Taken', user: owner }, otherSession))).status).toBe(403);
    expect((await handle(request('/hubs/slug', { hub, slug: 'new-harbor' }, ownerSession))).status).toBe(200);
    expect((await handle(request('/hubs/delete', { hub }, otherSession))).status).toBe(403);
    expect((await handle(request('/hubs/delete', { hub }, ownerSession))).status).toBe(200);
    expect(await new HubCataloguingConcept(db)._get({ hub })).toEqual([]);
  });
});
