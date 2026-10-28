import { describe, expect, test } from 'bun:test';
import { createApplication } from '@tests/fixture-application.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

type Gateway = ReturnType<typeof createApplication>['gateway'];
type Block = { block: string; kind: 'TEXT' | 'IMAGE'; body: string; alt: string };

describe('Reading local gateway', () => {
  const mongo = useMongoTestDb();

  async function createHub(gateway: Gateway, name: string) {
    const result = await gateway.invoke('/hubs/create', { name, label: 'First' });
    if (!result.ok) throw new Error(`Could not create hub ${name}`);
    const { hub, sequence } = result.value as { hub: string; sequence: string };
    const listed = await gateway.invoke('/checkpoints/list', { hub });
    if (!listed.ok) throw new Error('Could not list checkpoints');
    const checkpoints = (listed.value as { checkpoints: { checkpoint: string }[] }).checkpoints;
    return { hub, sequence, start: checkpoints[0]!.checkpoint, first: checkpoints[1]!.checkpoint };
  }

  async function createDocument(gateway: Gateway, hub: string, title: string,
    blocks: Omit<Block, 'block'>[]) {
    const result = await gateway.invoke('/fixtures/articles/create', { hub, title, blocks });
    if (!result.ok) throw new Error(`Could not create ${title}`);
    return result.value as { document: string; blocks: { block: string }[] };
  }

  async function tag(gateway: Gateway, hub: string, item: string, required: string[]) {
    const result = await gateway.invoke('/fixtures/requirements/tag', { hub, item, required });
    if (!result.ok) throw new Error(`Could not tag ${item}`);
  }

  async function select(gateway: Gateway, hub: string, reader: string, checkpoint: string) {
    const result = await gateway.invoke('/progress/record', { hub, reader, checkpoint });
    if (!result.ok) throw new Error('Could not select checkpoint');
  }

  test('lists hubs in identity order and distinguishes missing progress from NotStarted', async () => {
    const { gateway } = createApplication(mongo.db());
    expect(await gateway.invoke('/hubs/list', {})).toEqual({ ok: true, value: { hubs: [] } });
    const north = await createHub(gateway, 'North');
    const south = await createHub(gateway, 'South');
    expect(await gateway.invoke('/hubs/list', {})).toEqual({ ok: true, value: { hubs: [
      { hub: north.hub, name: 'North', slug: 'north' }, { hub: south.hub, name: 'South', slug: 'south' },
    ].sort((a, b) => a.hub.localeCompare(b.hub)) } });
    const publicDoc = await createDocument(gateway, north.hub, 'Public map', [
      { kind: 'IMAGE', body: 'data:image/png;base64,PUBLIC_MAP', alt: 'PUBLIC_MAP_ALT' },
    ]);
    await tag(gateway, north.hub, publicDoc.document, []);
    await tag(gateway, north.hub, publicDoc.blocks[0]!.block, []);
    expect(await gateway.invoke('/hubs/browse', { hub: north.hub, reader: 'alice' }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'PROGRESS_NOT_SET' } });
    expect(await gateway.invoke('/articles/read', {
      hub: north.hub, reader: 'alice', document: publicDoc.document,
    })).toMatchObject({ ok: false, error: { kind: 'domain', value: 'PROGRESS_NOT_SET' } });
    await select(gateway, north.hub, 'alice', north.start);
    expect(await gateway.invoke('/hubs/browse', { hub: north.hub, reader: 'alice' }))
      .toEqual({ ok: true, value: { documents: [{ document: publicDoc.document, title: 'Public map' }] } });
    expect(await gateway.invoke('/articles/read', {
      hub: north.hub, reader: 'alice', document: publicDoc.document,
    })).toEqual({ ok: true, value: { content: {
      document: publicDoc.document, title: 'Public map', blocks: [
        { block: publicDoc.blocks[0]!.block, kind: 'IMAGE', body: 'data:image/png;base64,PUBLIC_MAP', alt: 'PUBLIC_MAP_ALT' },
      ],
    } } });
    expect(await gateway.invoke('/progress/clear', { hub: north.hub, reader: 'alice' }))
      .toMatchObject({ ok: true, value: { cleared: true } });
    expect(await gateway.invoke('/hubs/browse', { hub: north.hub, reader: 'alice' }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'PROGRESS_NOT_SET' } });
  });

  test('filters document titles and complete block metadata at each checkpoint, then revokes on retreat', async () => {
    const { gateway } = createApplication(mongo.db());
    const { hub, sequence, start, first } = await createHub(gateway, 'Archive');
    const appended = await gateway.invoke('/checkpoints/append', { hub, sequence, label: 'Second' });
    if (!appended.ok) throw new Error('Could not append checkpoint');
    const second = (appended.value as { checkpoint: string }).checkpoint;
    const publicDoc = await createDocument(gateway, hub, 'Open guide', [
      { kind: 'TEXT', body: 'PUBLIC_TEXT', alt: '' },
      { kind: 'IMAGE', body: 'https://hidden.example/FIRST_IMAGE_URL', alt: 'FIRST_IMAGE_ALT' },
      { kind: 'TEXT', body: 'SECOND_TEXT_SECRET', alt: '' },
      { kind: 'TEXT', body: 'UNTAGGED_BLOCK_SECRET', alt: '' },
    ]);
    const hiddenDoc = await createDocument(gateway, hub, 'SECOND_DOCUMENT_SECRET', [
      { kind: 'TEXT', body: 'SECOND_DOCUMENT_BODY_SECRET', alt: '' },
    ]);
    const untaggedDoc = await createDocument(gateway, hub, 'UNTAGGED_DOCUMENT_SECRET', []);
    await tag(gateway, hub, publicDoc.document, []);
    await tag(gateway, hub, publicDoc.blocks[0]!.block, []);
    await tag(gateway, hub, publicDoc.blocks[1]!.block, [first]);
    await tag(gateway, hub, publicDoc.blocks[2]!.block, [second]);
    await tag(gateway, hub, hiddenDoc.document, [second]);
    await tag(gateway, hub, hiddenDoc.blocks[0]!.block, []);

    const browse = () => gateway.invoke('/hubs/browse', { hub, reader: 'alice' });
    const read = () => gateway.invoke('/articles/read', { hub, reader: 'alice', document: publicDoc.document });
    await select(gateway, hub, 'alice', start);
    const atStart = await read();
    expect(atStart).toEqual({ ok: true, value: { content: { document: publicDoc.document, title: 'Open guide', blocks: [
      { block: publicDoc.blocks[0]!.block, kind: 'TEXT', body: 'PUBLIC_TEXT', alt: '' },
    ] } } });
    expect(await browse()).toEqual({ ok: true, value: { documents: [
      { document: publicDoc.document, title: 'Open guide' },
    ] } });
    for (const secret of [
      'FIRST_IMAGE_URL', 'FIRST_IMAGE_ALT', 'SECOND_TEXT_SECRET', 'UNTAGGED_BLOCK_SECRET',
      'SECOND_DOCUMENT_SECRET', 'SECOND_DOCUMENT_BODY_SECRET', 'UNTAGGED_DOCUMENT_SECRET',
      hiddenDoc.document, untaggedDoc.document,
      publicDoc.blocks[1]!.block, publicDoc.blocks[2]!.block, publicDoc.blocks[3]!.block,
    ]) expect(JSON.stringify({ atStart, directory: await browse() })).not.toContain(secret);
    expect(await gateway.invoke('/articles/read', { hub, reader: 'alice', document: hiddenDoc.document }))
      .toEqual({ ok: true, value: { content: null } });
    expect(await gateway.invoke('/articles/read', { hub, reader: 'alice', document: untaggedDoc.document }))
      .toEqual({ ok: true, value: { content: null } });

    await select(gateway, hub, 'alice', first);
    const atFirst = await read();
    expect((atFirst as { value: { content: { blocks: Block[] } } }).value.content.blocks.map(({ block }) => block))
      .toEqual([publicDoc.blocks[0]!.block, publicDoc.blocks[1]!.block]);
    expect(JSON.stringify(atFirst)).not.toContain('SECOND_TEXT_SECRET');
    expect(JSON.stringify(atFirst)).not.toContain('UNTAGGED_BLOCK_SECRET');
    await select(gateway, hub, 'alice', second);
    expect(await browse()).toEqual({ ok: true, value: { documents: [
      { document: publicDoc.document, title: 'Open guide' },
      { document: hiddenDoc.document, title: 'SECOND_DOCUMENT_SECRET' },
    ].sort((a, b) => a.document.localeCompare(b.document)) } });
    const atSecond = await read();
    expect((atSecond as { value: { content: { blocks: Block[] } } }).value.content.blocks.map(({ block }) => block))
      .toEqual([publicDoc.blocks[0]!.block, publicDoc.blocks[1]!.block, publicDoc.blocks[2]!.block]);
    expect(JSON.stringify(atSecond)).not.toContain('UNTAGGED_BLOCK_SECRET');
    await select(gateway, hub, 'alice', start);
    expect(await browse()).toEqual({ ok: true, value: { documents: [
      { document: publicDoc.document, title: 'Open guide' },
    ] } });
    const afterRetreat = await read();
    expect(afterRetreat).toEqual(atStart);
    expect(JSON.stringify({ afterRetreat, directory: await browse() }))
      .not.toContain('SECOND_DOCUMENT_SECRET');
  });

  test('isolates hubs and readers, and returns null for inaccessible documents', async () => {
    const { gateway } = createApplication(mongo.db());
    const north = await createHub(gateway, 'North');
    const south = await createHub(gateway, 'South');
    const imageOnly = await createDocument(gateway, south.hub, 'Southern image', [
      { kind: 'IMAGE', body: '/south.png', alt: 'Southern view' },
    ]);
    await tag(gateway, south.hub, imageOnly.document, []);
    await tag(gateway, south.hub, imageOnly.blocks[0]!.block, [south.start]);
    await select(gateway, north.hub, 'alice', north.first);
    expect(await gateway.invoke('/hubs/browse', { hub: south.hub, reader: 'alice' }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'PROGRESS_NOT_SET' } });
    await select(gateway, south.hub, 'alice', south.start);
    expect(await gateway.invoke('/hubs/browse', { hub: south.hub, reader: 'bob' }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'PROGRESS_NOT_SET' } });
    expect(await gateway.invoke('/articles/read', {
      hub: north.hub, reader: 'alice', document: imageOnly.document,
    })).toEqual({ ok: true, value: { content: null } });
    expect(await gateway.invoke('/articles/read', {
      hub: south.hub, reader: 'alice', document: 'missing',
    })).toEqual({ ok: true, value: { content: null } });
    expect(await gateway.invoke('/articles/read', {
      hub: south.hub, reader: 'alice', document: imageOnly.document,
    })).toEqual({ ok: true, value: { content: {
      document: imageOnly.document, title: 'Southern image', blocks: [
        { block: imageOnly.blocks[0]!.block, kind: 'IMAGE', body: '/south.png', alt: 'Southern view' },
      ],
    } } });
    expect(await gateway.invoke('/hubs/browse', { hub: 'South', reader: 'alice' }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'HUB_NOT_FOUND' } });
    expect(await gateway.invoke('/hubs/browse', { hub: 'missing', reader: 'alice' }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'HUB_NOT_FOUND' } });
    expect(await gateway.invoke('/articles/read', {
      hub: 'missing', reader: 'alice', document: imageOnly.document,
    })).toMatchObject({ ok: false, error: { kind: 'domain', value: 'HUB_NOT_FOUND' } });
    expect(await gateway.invoke('/hubs/browse', { hub: south.hub, reader: ' ' }))
      .toMatchObject({ ok: false, error: { kind: 'framework', code: 'INVALID_INPUT' } });
    expect(await gateway.invoke('/articles/read', {
      hub: south.hub, reader: 'alice', document: '',
    })).toMatchObject({ ok: false, error: { kind: 'framework', code: 'INVALID_INPUT' } });
  });
});
