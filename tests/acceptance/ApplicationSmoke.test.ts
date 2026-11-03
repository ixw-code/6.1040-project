import { describe, expect, test } from 'bun:test';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { createReaderHttpHandler } from '@/http/edge.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

describe('application smoke test', () => {
  const mongo = useMongoTestDb();

  test('creates an authenticated hub that remains available after handler restart', async () => {
    const options = { origin: 'http://localhost:3000', cookieKey: Buffer.alloc(32, 4), providers: {} };
    const db = mongo.db();
    const { user } = await new RegisteringConcept(db).register({
      username: 'smoke', provider: 'GOOGLE', providerSubject: 'smoke-subject',
    });
    const session = (await new SessioningConcept(db).start({ user })).session;

    let server = Bun.serve({ hostname: '127.0.0.1', port: 0,
      fetch: createReaderHttpHandler(db, options) });
    const post = async (path: string, input: object) => {
      const response = await fetch(`http://127.0.0.1:${server.port}/api${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: options.origin,
          cookie: `__Host-wikiplotter_session=${session}` },
        body: JSON.stringify(input),
      });
      return { status: response.status, body: await response.json() as Record<string, unknown> };
    };

    try {
      const created = await post('/hubs/create', { name: 'Smoke Test' });
      expect(created.status).toBe(200);
      const { hub, sequence } = created.body as { hub: string; sequence: string };

      server.stop();
      server = Bun.serve({ hostname: '127.0.0.1', port: 0,
        fetch: createReaderHttpHandler(await mongo.reconnect(), options) });
      expect(await post('/hubs/list', {})).toMatchObject({ status: 200, body: {
        hubs: [expect.objectContaining({ hub, name: 'Smoke Test' })],
      } });
      const listed = await post('/checkpoints/list', { hub });
      expect(listed).toMatchObject({ status: 200, body: {
        sequence,
        checkpoints: [{ label: 'NotStarted', position: 0 }],
      } });
      const start = (listed.body.checkpoints as { checkpoint: string; label: string }[])[0]!.checkpoint;
      const createdArticle = await post('/articles/create', { hub, title: 'Standalone article', required: [],
        blocks: [{ kind: 'TEXT', body: 'Ordinary reads work', alt: '', required: [] }] });
      expect(createdArticle.status).toBe(200);
      const document = createdArticle.body.document as string;
      expect(await post('/progress/record', { hub, checkpoint: start })).toMatchObject({
        status: 200, body: { checkpoint: start },
      });
      expect(await post('/hubs/browse', { hub })).toMatchObject({ status: 200, body: {
        documents: [{ document, title: 'Standalone article' }],
      } });
      expect(await post('/articles/read', { hub, document })).toMatchObject({ status: 200, body: {
        content: { document, blocks: [{ body: 'Ordinary reads work' }] },
      } });
    } finally {
      server.stop();
    }
  });
});
