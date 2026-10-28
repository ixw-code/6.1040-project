import { describe, expect, test } from 'bun:test';
import { createApplication } from '@/application.ts';
import { createReaderHttpHandler } from '@/edge.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';

describe('Alpha reader journey over HTTP', () => {
  const mongo = useMongoTestDb();

  test('keeps spoiler metadata hidden across readers, hubs, progress changes, and reconnection', async () => {
    const options = { origin: 'http://localhost:3000', cookieKey: Buffer.alloc(32, 4), providers: {} };
    const sessions = new SessioningConcept(mongo.db());
    const alice = (await sessions.start({ user: 'alice' })).session;
    const bob = (await sessions.start({ user: 'bob' })).session;
    let server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: createReaderHttpHandler(mongo.db(), options) });
    const post = async (path: string, input: object) => {
      const reader = 'reader' in input ? input.reader : undefined;
      const cookie = reader === 'alice' ? `__Host-wikiplotter_session=${alice}` :
        reader === 'bob' ? `__Host-wikiplotter_session=${bob}` : '';
      const response = await fetch(`http://127.0.0.1:${server.port}/api${path}`, {
        method: 'POST', headers: { 'content-type': 'application/json', origin: options.origin, cookie },
        body: JSON.stringify(input),
      });
      return { status: response.status, body: await response.json() as Record<string, unknown> };
    };
    const setup = createApplication(mongo.db()).gateway;
    const invoke = async (path: string, input: object) => {
      const result = await setup.invoke(path, input);
      if (!result.ok) throw new Error(`${path}: ${JSON.stringify(result.error)}`);
      return result.value as Record<string, unknown>;
    };
    try {
      const north = (await post('/hubs/create', { name: 'North', label: 'First' })).body;
      const south = (await post('/hubs/create', { name: 'South', label: 'First' })).body;
      const hub = north.hub as string;
      const otherHub = south.hub as string;
      const sequence = north.sequence as string;
      expect(await post('/hubs/rename', { hub, name: 'Northern Archive' }))
        .toEqual({ status: 200, body: { hub } });
      const initial = (await post('/checkpoints/list', { hub })).body.checkpoints as
        { checkpoint: string; label: string; position: number }[];
      expect(initial.map(({ label, position }) => ({ label, position }))).toEqual([
        { label: 'NotStarted', position: 0 }, { label: 'First', position: 1 },
      ]);
      const [start, first] = initial.map(({ checkpoint }) => checkpoint) as [string, string];
      const second = (await post('/checkpoints/append', { hub, sequence, label: 'Second' }))
        .body.checkpoint as string;
      expect(await post('/checkpoints/append', { hub: otherHub, sequence, label: 'Foreign' }))
        .toEqual({ status: 404, body: { error: 'NOT_FOUND' } });

      const publicDoc = await invoke('/setup/documents/create', { hub, title: 'Open guide', blocks: [
        { kind: 'TEXT', body: 'PUBLIC_TEXT', alt: '' },
        { kind: 'IMAGE', body: 'https://hidden.example/FIRST_URL_SECRET', alt: 'FIRST_ALT_SECRET' },
        { kind: 'TEXT', body: 'SECOND_BODY_SECRET', alt: '' },
        { kind: 'TEXT', body: 'UNTAGGED_BLOCK_SECRET', alt: '' },
      ] });
      const restrictedDoc = await invoke('/setup/documents/create', { hub, title: 'HIDDEN_TITLE_SECRET', blocks: [
        { kind: 'TEXT', body: 'HIDDEN_DOCUMENT_BODY_SECRET', alt: '' },
      ] });
      const untaggedDoc = await invoke('/setup/documents/create', { hub, title: 'UNTAGGED_TITLE_SECRET', blocks: [] });
      const imageDoc = await invoke('/setup/documents/create', { hub, title: 'Image only', blocks: [
        { kind: 'IMAGE', body: '/public-image.png', alt: 'Public image' },
      ] });
      const blocks = publicDoc.blocks as { block: string }[];
      const imageBlock = (imageDoc.blocks as { block: string }[])[0]!.block;
      for (const [item, required] of [
        [publicDoc.document, []], [blocks[0]!.block, []], [blocks[1]!.block, [first]],
        [blocks[2]!.block, [second]], [restrictedDoc.document, [second]],
        [(restrictedDoc.blocks as { block: string }[])[0]!.block, []],
        [imageDoc.document, []], [imageBlock, [start]],
      ] as [string, string[]][]) {
        await invoke('/setup/items/tag', { hub, item, required });
      }
      const southDoc = await invoke('/setup/documents/create', { hub: otherHub, title: 'South only', blocks: [] });
      await invoke('/setup/items/tag', { hub: otherHub, item: southDoc.document, required: [] });

      expect(await post('/progress/get', { hub, reader: 'alice' }))
        .toEqual({ status: 200, body: { checkpoint: null } });
      expect(await post('/hubs/browse', { hub, reader: 'alice' }))
        .toEqual({ status: 400, body: { error: 'INVALID_REQUEST' } });
      expect(await post('/progress/record', { hub, reader: 'alice', checkpoint: start }))
        .toEqual({ status: 200, body: { checkpoint: start } });
      const atStart = await post('/content/documents/read', { hub, reader: 'alice', document: publicDoc.document });
      expect(atStart).toEqual({ status: 200, body: { content: {
        document: publicDoc.document, title: 'Open guide', blocks: [
          { block: blocks[0]!.block, kind: 'TEXT', body: 'PUBLIC_TEXT', alt: '' },
        ],
      } } });
      const startBrowse = await post('/hubs/browse', { hub, reader: 'alice' });
      expect((startBrowse.body.documents as { title: string }[]).map(({ title }) => title).sort())
        .toEqual(['Image only', 'Open guide']);
      const hidden = [
        'FIRST_URL_SECRET', 'FIRST_ALT_SECRET', 'SECOND_BODY_SECRET', 'UNTAGGED_BLOCK_SECRET',
        'HIDDEN_TITLE_SECRET', 'HIDDEN_DOCUMENT_BODY_SECRET', 'UNTAGGED_TITLE_SECRET',
        restrictedDoc.document, untaggedDoc.document, blocks[1]!.block, blocks[2]!.block,
        blocks[3]!.block, southDoc.document,
      ];
      for (const secret of hidden) expect(JSON.stringify({ atStart, startBrowse })).not.toContain(secret);
      expect(await post('/content/documents/read', { hub, reader: 'alice', document: restrictedDoc.document }))
        .toEqual({ status: 200, body: { content: null } });
      expect(await post('/content/documents/read', { hub, reader: 'alice', document: imageDoc.document }))
        .toEqual({ status: 200, body: { content: { document: imageDoc.document, title: 'Image only', blocks: [
          { block: imageBlock, kind: 'IMAGE', body: '/public-image.png', alt: 'Public image' },
        ] } } });
      expect(await post('/hubs/browse', { hub, reader: 'bob' }))
        .toEqual({ status: 400, body: { error: 'INVALID_REQUEST' } });
      expect(await post('/hubs/browse', { hub: otherHub, reader: 'alice' }))
        .toEqual({ status: 400, body: { error: 'INVALID_REQUEST' } });
      expect(await post('/content/documents/read', { hub, reader: 'alice', document: southDoc.document }))
        .toEqual({ status: 200, body: { content: null } });
      expect(await post('/progress/record', { hub: otherHub, reader: 'alice', checkpoint: second }))
        .toEqual({ status: 404, body: { error: 'NOT_FOUND' } });

      await post('/progress/record', { hub, reader: 'alice', checkpoint: first });
      const atFirst = await post('/content/documents/read', { hub, reader: 'alice', document: publicDoc.document });
      expect(((atFirst.body.content as { blocks: { block: string }[] }).blocks).map(({ block }) => block))
        .toEqual([blocks[0]!.block, blocks[1]!.block]);
      expect(JSON.stringify(atFirst)).not.toContain('SECOND_BODY_SECRET');
      await post('/progress/record', { hub, reader: 'alice', checkpoint: second });
      expect((await post('/hubs/browse', { hub, reader: 'alice' })).body.documents)
        .toContainEqual({ document: restrictedDoc.document, title: 'HIDDEN_TITLE_SECRET' });
      await post('/progress/record', { hub, reader: 'bob', checkpoint: second });
      await post('/progress/record', { hub, reader: 'alice', checkpoint: start });
      expect(await post('/content/documents/read', { hub, reader: 'alice', document: publicDoc.document }))
        .toEqual(atStart);
      expect((await post('/hubs/browse', { hub, reader: 'bob' })).body.documents)
        .toContainEqual({ document: restrictedDoc.document, title: 'HIDDEN_TITLE_SECRET' });

      server.stop();
      const reconnected = await mongo.reconnect();
      server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: createReaderHttpHandler(reconnected, options) });
      expect(await post('/progress/get', { hub, reader: 'alice' }))
        .toEqual({ status: 200, body: { checkpoint: start } });
      expect(await post('/progress/get', { hub, reader: 'bob' }))
        .toEqual({ status: 200, body: { checkpoint: second } });
      expect((await post('/hubs/list', {})).body.hubs)
        .toContainEqual({ hub, name: 'Northern Archive' });
      expect(await post('/content/documents/read', { hub, reader: 'alice', document: publicDoc.document }))
        .toEqual(atStart);
      expect(await post('/progress/clear', { hub, reader: 'alice' }))
        .toEqual({ status: 200, body: { cleared: true } });
      expect(await post('/progress/get', { hub, reader: 'alice' }))
        .toEqual({ status: 200, body: { checkpoint: null } });
      expect(await post('/setup/documents/create', { hub, title: 'Forbidden', blocks: [] }))
        .toEqual({ status: 404, body: { error: 'NOT_FOUND' } });
    } finally {
      server.stop();
    }
  });
});
