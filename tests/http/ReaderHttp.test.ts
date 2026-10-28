import { describe, expect, test } from 'bun:test';
import { createApplication } from '@/assembly/application.ts';
import { createReaderHttpHandler } from '@/http/edge.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';

describe('reader HTTP adapter', () => {
  const mongo = useMongoTestDb();

  function listen() {
    return Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: createReaderHttpHandler(mongo.db(), {
      origin: 'http://localhost:3000', cookieKey: Buffer.alloc(32, 2), providers: {},
    }) });
  }

  async function post(server: ReturnType<typeof listen>, path: string, input: unknown) {
    const reader = input && typeof input === 'object' && 'reader' in input ? input.reader : undefined;
    const session = typeof reader === 'string'
      ? (await new SessioningConcept(mongo.db()).start({ user: reader })).session : undefined;
    const response = await fetch(`http://127.0.0.1:${server.port}${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000',
        ...(session ? { cookie: `__Host-wikiplotter_session=${session}` } : {}) }, body: JSON.stringify(input),
    });
    return { status: response.status, body: await response.json() as Record<string, unknown> };
  }

  test('serves HubManagement, ReaderProgress, and Reading with existing response shapes', async () => {
    const server = listen();
    try {
      const created = await post(server, '/api/hubs/create', { name: 'North', label: 'Chapter 1' });
      expect(created.status).toBe(200);
      const { hub, sequence } = created.body as { hub: string; sequence: string };
      expect(typeof hub).toBe('string');
      expect(typeof sequence).toBe('string');
      const listed = await post(server, '/api/checkpoints/list', { hub });
      expect(listed.status).toBe(200);
      const checkpoints = (listed.body as { checkpoints: { checkpoint: string }[] }).checkpoints;
      const start = checkpoints[0]!.checkpoint;
      const first = checkpoints[1]!.checkpoint;
      expect(typeof start).toBe('string');
      expect(typeof first).toBe('string');
      expect(listed.body).toEqual({ sequence, checkpoints: [
        { checkpoint: start, label: 'NotStarted', position: 0 },
        { checkpoint: first, label: 'Chapter 1', position: 1 },
      ] });
      expect(await post(server, '/api/hubs/sequences', { hub }))
        .toEqual({ status: 200, body: { sequences: [{ sequence }] } });
      const appended = await post(server, '/api/checkpoints/append', { hub, sequence, label: 'Chapter 2' });
      expect(appended.status).toBe(200);
      const second = appended.body.checkpoint as string;
      expect(typeof second).toBe('string');
      expect(await post(server, '/api/checkpoints/relabel', { hub, checkpoint: first, label: 'Opening' }))
        .toEqual({ status: 200, body: { checkpoint: first } });
      expect(await post(server, '/api/hubs/rename', { hub, name: 'Northern' }))
        .toEqual({ status: 200, body: { hub } });
      expect(await post(server, '/api/hubs/list', {}))
        .toEqual({ status: 200, body: { hubs: [{ hub, name: 'Northern' }] } });
      expect(await post(server, '/api/checkpoints/list', { hub }))
        .toEqual({ status: 200, body: { sequence, checkpoints: [
          { checkpoint: start, label: 'NotStarted', position: 0 },
          { checkpoint: first, label: 'Opening', position: 1 },
          { checkpoint: second, label: 'Chapter 2', position: 2 },
        ] } });
      const setup = createApplication(mongo.db()).gateway;
      const document = await setup.invoke('/setup/documents/create', { hub, title: 'Public map', blocks: [
        { kind: 'IMAGE', body: '/public-map.png', alt: 'Map' },
      ] });
      if (!document.ok) throw new Error('Could not install test document');
      const { document: documentId, blocks } = document.value as { document: string; blocks: { block: string }[] };
      expect(typeof blocks[0]!.block).toBe('string');
      expect(await setup.invoke('/setup/items/tag', { hub, item: documentId, required: [] }))
        .toMatchObject({ ok: true });
      expect(await setup.invoke('/setup/items/tag', { hub, item: blocks[0]!.block, required: [start] }))
        .toMatchObject({ ok: true });
      expect(await post(server, '/api/progress/get', { hub, reader: 'alice' }))
        .toEqual({ status: 200, body: { checkpoint: null } });
      expect(await post(server, '/api/hubs/browse', { hub, reader: 'alice' }))
        .toEqual({ status: 400, body: { error: 'INVALID_REQUEST' } });
      expect(await post(server, '/api/progress/record', { hub, reader: 'alice', checkpoint: start }))
        .toEqual({ status: 200, body: { checkpoint: start } });
      expect(await post(server, '/api/hubs/browse', { hub, reader: 'alice' }))
        .toEqual({ status: 200, body: { documents: [{ document: documentId, title: 'Public map' }] } });
      expect(await post(server, '/api/content/documents/read', { hub, reader: 'alice', document: documentId }))
        .toEqual({ status: 200, body: { content: {
          document: documentId, title: 'Public map', blocks: [
            { block: blocks[0]!.block, kind: 'IMAGE', body: '/public-map.png', alt: 'Map' },
          ],
        } } });
      expect(await post(server, '/api/progress/clear', { hub, reader: 'alice' }))
        .toEqual({ status: 200, body: { cleared: true } });
      expect(await post(server, '/api/progress/get', { hub, reader: 'alice' }))
        .toEqual({ status: 200, body: { checkpoint: null } });
    } finally {
      server.stop();
    }
  });

  test('preserves validation and domain refusals over HTTP', async () => {
    const server = listen();
    try {
      const invalid = await post(server, '/api/hubs/create', { name: 'Bad', label: ' ' });
      expect(invalid.status).toBe(400);
      expect(invalid.body).toMatchObject({ error: 'INVALID_REQUEST' });
      expect(await post(server, '/api/hubs/create', { name: 'North', label: 'First' }))
        .toMatchObject({ status: 200 });
      expect(await post(server, '/api/hubs/create', { name: 'North', label: 'First' }))
        .toEqual({ status: 409, body: { error: 'CONFLICT' } });
      const missing = await post(server, '/api/hubs/browse', { hub: 'missing', reader: 'alice' });
      expect(missing.body).toMatchObject({ error: 'NOT_FOUND' });
      expect(missing.status).toBe(404);
      const malformed = await fetch(`http://127.0.0.1:${server.port}/api/hubs/list`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
      });
      expect(malformed.status).toBe(400);
      expect((await malformed.json()) as Record<string, unknown>).toMatchObject({ error: 'INVALID_REQUEST' });
    } finally {
      server.stop();
    }
  });

  test('rejects ContentManagement operations at the HTTP boundary', async () => {
    const server = listen();
    try {
      for (const [path, input] of [
        ['/api/setup/documents/create', { hub: 'missing', title: 'Forbidden', blocks: [] }],
        ['/api/setup/items/tag', { hub: 'missing', item: 'document:x', required: [] }],
        ['/api/setup/items/untag', { hub: 'missing', item: 'document:x' }],
      ] as const) {
        const result = await post(server, path, input);
        expect(result.status).toBe(404);
      }
      const get = await fetch(`http://127.0.0.1:${server.port}/api/hubs/list`);
      expect(get.status).toBe(400);
      expect((await post(server, '/hubs/list', {})).status).toBe(404);
      expect(await mongo.db().collection('documents').countDocuments()).toBe(0);
      expect(await mongo.db().collection('requirements').countDocuments()).toBe(0);
    } finally {
      server.stop();
    }
  });
});
