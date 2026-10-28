import { describe, expect, test } from 'bun:test';
import { createReaderHttpHandler } from '@/http/edge.ts';
import { createApplication } from '@/assembly/application.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';
import { createCookieSealer } from '@/auth/sealed-cookie.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

const origin = 'http://localhost:3000';
const key = Buffer.alloc(32, 3);

describe('reader identity HTTP boundary', () => {
  const mongo = useMongoTestDb();
  let now = new Date('2026-01-01T00:00:00Z');
  function listen() {
    return Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: createReaderHttpHandler(mongo.db(), {
      origin, cookieKey: key, providers: {}, clock: () => now,
    }) });
  }
  async function post(server: ReturnType<typeof listen>, path: string, body: object, cookie = '') {
    const result = await fetch(`http://127.0.0.1:${server.port}${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin, cookie }, body: JSON.stringify(body),
    });
    return { status: result.status, body: await result.json() as Record<string, unknown>,
      cookie: result.headers.getSetCookie().find((row) => row.startsWith('__Host-wikiplotter_progress='))?.split(';')[0] ?? '' };
  }

  test('guest selection stays in a signed cookie, rejects tampering and expiry, and filters reading', async () => {
    now = new Date('2026-01-01T00:00:00Z');
    const { gateway } = createApplication(mongo.db());
    const created = await gateway.invoke('/hubs/create', { name: 'North', label: 'First' });
    if (!created.ok) throw Error('hub');
    const { hub } = created.value as { hub: string };
    const checkpoints = await gateway.invoke('/checkpoints/list', { hub });
    if (!checkpoints.ok) throw Error('checkpoints');
    const [start, first] = (checkpoints.value as { checkpoints: { checkpoint: string }[] }).checkpoints;
    const article = await gateway.invoke('/setup/documents/create', { hub, title: 'Visible', blocks: [] });
    if (!article.ok) throw Error('article');
    const document = (article.value as { document: string }).document;
    await gateway.invoke('/setup/items/tag', { hub, item: document, required: [] });
    const server = listen();
    try {
      expect((await post(server, '/api/hubs/browse', { hub, reader: 'forged' })).status).toBe(400);
      const recorded = await post(server, '/api/progress/record', { hub, reader: 'forged', checkpoint: start!.checkpoint });
      expect(recorded.status).toBe(200);
      expect(recorded.cookie).toStartWith('__Host-wikiplotter_progress=');
      expect(await mongo.db().collection('progress').countDocuments()).toBe(0);
      expect((await post(server, '/api/progress/get', { hub, reader: 'someone' }, recorded.cookie)).body)
        .toEqual({ checkpoint: start!.checkpoint });
      expect(await post(server, '/api/progress/get', { hub: 'deleted-hub' }, recorded.cookie))
        .toMatchObject({ status: 404, body: { error: 'NOT_FOUND' } });
      expect((await post(server, '/api/hubs/browse', { hub }, recorded.cookie)).body)
        .toEqual({ documents: [{ document, title: 'Visible' }] });
      expect((await post(server, '/api/progress/get', { hub }, `${recorded.cookie}x`)).body)
        .toEqual({ checkpoint: null });
      const moved = await post(server, '/api/progress/record', { hub, checkpoint: first!.checkpoint }, recorded.cookie);
      expect(moved.status).toBe(200);
      expect((await post(server, '/api/progress/get', { hub }, moved.cookie)).body)
        .toEqual({ checkpoint: first!.checkpoint });
      now = new Date('2026-02-01T00:00:00Z');
      expect((await post(server, '/api/progress/get', { hub }, moved.cookie)).body)
        .toEqual({ checkpoint: null });
    } finally { server.stop(); }
  });

  test('session user overrides forged reader and guest cookie; expiry blocks access', async () => {
    now = new Date('2026-01-01T00:00:00Z');
    const { gateway } = createApplication(mongo.db());
    const created = await gateway.invoke('/hubs/create', { name: 'South', label: 'First' });
    if (!created.ok) throw Error('hub');
    const hub = (created.value as { hub: string }).hub;
    const checkpoints = await gateway.invoke('/checkpoints/list', { hub });
    if (!checkpoints.ok) throw Error('checkpoints');
    const start = (checkpoints.value as { checkpoints: { checkpoint: string }[] }).checkpoints[0]!.checkpoint;
    const session = (await new SessioningConcept(mongo.db(), () => now).start({ user: 'real-user' })).session;
    const guest = createCookieSealer(key, () => now).seal({ progress: { [hub]: start } }, 30 * 86400000);
    const server = listen();
    try {
      const cookies = `__Host-wikiplotter_session=${session}; __Host-wikiplotter_progress=${guest}`;
      expect((await post(server, '/api/progress/get', { hub, reader: 'forged' }, cookies)).body)
        .toEqual({ checkpoint: null });
      expect((await post(server, '/api/progress/record', { hub, reader: 'forged', checkpoint: start }, cookies)).status).toBe(200);
      expect(await new ProgressRecordingConcept(mongo.db())._checkpoint({ scope: hub, reader: 'real-user' }))
        .toEqual([{ checkpoint: start }]);
      expect(await new ProgressRecordingConcept(mongo.db())._checkpoint({ scope: hub, reader: 'forged' }))
        .toEqual([]);
      now = new Date('2026-01-09T00:00:00Z');
      expect((await post(server, '/api/progress/get', { hub }, cookies)).status).toBe(401);
    } finally { server.stop(); }
  });
});
