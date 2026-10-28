import { describe, expect, test } from 'bun:test';
import { createApplication } from '@/assembly/application.ts';
import { assembleWikiplotter } from '@/assembly/assembly.ts';
import { DocumentingConcept } from '@/concepts/Documenting/Documenting.ts';
import { RequirementTaggingConcept } from '@/concepts/RequirementTagging/RequirementTagging.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

describe('ContentManagement local gateway', () => {
  const mongo = useMongoTestDb();

  test('keeps setup routes out of the reader assembly', () => {
    const routes = Object.keys(assembleWikiplotter(mongo.db()).publicInterface.routes).sort();
    expect(routes).toEqual([
      '/checkpoints/append', '/checkpoints/list', '/checkpoints/relabel',
      '/content/documents/read', '/hubs/browse', '/hubs/create', '/hubs/list',
      '/hubs/rename', '/hubs/sequences',
      '/progress/clear', '/progress/get', '/progress/record',
    ]);
  });

  async function createHub(gateway: ReturnType<typeof createApplication>['gateway'], name: string) {
    const result = await gateway.invoke('/hubs/create', { name, label: 'Chapter 1' });
    if (!result.ok) throw new Error(`Could not create hub ${name}`);
    const { hub } = result.value as { hub: string };
    const listed = await gateway.invoke('/checkpoints/list', { hub });
    if (!listed.ok) throw new Error(`Could not list checkpoints for ${name}`);
    const checkpoints = (listed.value as { checkpoints: { checkpoint: string }[] }).checkpoints;
    return { hub, start: checkpoints[0]!.checkpoint, first: checkpoints[1]!.checkpoint };
  }

  test('creates ordered text and image blocks with a separate required title', async () => {
    const { gateway } = createApplication(mongo.db());
    const { hub } = await createHub(gateway, 'North');
    const result = await gateway.invoke('/setup/documents/create', {
      hub, title: '  Atlas  ', blocks: [
        { kind: 'TEXT', body: 'Opening', alt: '' },
        { kind: 'IMAGE', body: '/map.png', alt: 'Map' },
        { kind: 'TEXT', body: 'End', alt: '' },
      ],
    });
    if (!result.ok) throw new Error('Document creation failed');
    const { document, blocks } = result.value as { document: string; blocks: { block: string }[] };
    expect(blocks).toHaveLength(3);
    expect(new Set(blocks.map(({ block }) => block)).size).toBe(3);
    const documenting = new DocumentingConcept(mongo.db());
    expect(await documenting._title({ scope: hub, document })).toEqual([{ title: 'Atlas' }]);
    expect((await documenting._blocks({ scope: hub, document })).map(({ kind }) => kind))
      .toEqual(['TEXT', 'IMAGE', 'TEXT']);
    expect((await documenting._blocks({ scope: hub, document })).map(({ block }) => ({ block })))
      .toEqual(blocks);
    const tagging = new RequirementTaggingConcept(mongo.db());
    expect(await tagging._rule({ item: document })).toEqual([]);
    expect(await tagging._rule({ item: blocks[0]!.block })).toEqual([]);
    expect(await tagging._eligible({ item: document, tokens: [] })).toEqual({ eligible: false });
  });

  test('supports image-only and empty content while requiring a title', async () => {
    const { gateway } = createApplication(mongo.db());
    const { hub } = await createHub(gateway, 'North');
    const image = await gateway.invoke('/setup/documents/create', {
      hub, title: 'Map', blocks: [{ kind: 'IMAGE', body: '/map.png', alt: 'World map' }],
    });
    const empty = await gateway.invoke('/setup/documents/create', { hub, title: 'Index', blocks: [] });
    expect(image).toMatchObject({ ok: true, value: { blocks: [{ block: expect.any(String) }] } });
    expect(empty).toMatchObject({ ok: true, value: { blocks: [] } });
    expect(await gateway.invoke('/setup/documents/create', { hub, title: ' ', blocks: [] }))
      .toMatchObject({ ok: false, error: { kind: 'framework', code: 'INVALID_INPUT' } });
    expect(await gateway.invoke('/setup/documents/create', { hub, title: 'Bad', blocks: [
      { kind: 'IMAGE', body: '/map.png', alt: ' ' },
    ] })).toMatchObject({ ok: false, error: { kind: 'framework', code: 'INVALID_INPUT' } });
    expect(await gateway.invoke('/setup/documents/create', { hub, title: 'Bad', blocks: [
      { kind: 'TITLE', body: 'Bad', alt: '' },
    ] })).toMatchObject({ ok: false, error: { kind: 'framework', code: 'INVALID_INPUT' } });
  });

  test('rejects nonexistent hubs, duplicate titles, foreign items and tokens', async () => {
    const { gateway } = createApplication(mongo.db());
    const north = await createHub(gateway, 'North');
    const south = await createHub(gateway, 'South');
    expect(await gateway.invoke('/setup/documents/create', { hub: 'missing', title: 'Lost', blocks: [] }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'HUB_NOT_FOUND' } });
    const northDoc = await gateway.invoke('/setup/documents/create', {
      hub: north.hub, title: 'Same', blocks: [{ kind: 'TEXT', body: 'North', alt: '' }],
    });
    const southDoc = await gateway.invoke('/setup/documents/create', {
      hub: south.hub, title: 'Same', blocks: [],
    });
    if (!northDoc.ok || !southDoc.ok) throw new Error('Document creation failed');
    const { document, blocks } = northDoc.value as { document: string; blocks: { block: string }[] };
    expect(await gateway.invoke('/setup/documents/create', {
      hub: north.hub, title: ' Same ', blocks: [],
    })).toMatchObject({ ok: false, error: { kind: 'domain', value: 'DOCUMENT_TITLE_TAKEN' } });
    const tagging = new RequirementTaggingConcept(mongo.db());
    for (const item of [document, blocks[0]!.block]) {
      expect(await gateway.invoke('/setup/items/tag', {
        hub: south.hub, item, required: [],
      })).toMatchObject({ ok: false, error: { kind: 'domain', value: 'ITEM_NOT_FOUND' } });
      expect(await gateway.invoke('/setup/items/untag', { hub: south.hub, item }))
        .toMatchObject({ ok: false, error: { kind: 'domain', value: 'ITEM_NOT_FOUND' } });
      expect(await tagging._rule({ item })).toEqual([]);
    }
    expect(await gateway.invoke('/setup/items/tag', {
      hub: north.hub, item: document, required: [south.first],
    })).toMatchObject({ ok: false, error: { kind: 'domain', value: 'INVALID_REQUIREMENTS' } });
    expect(await gateway.invoke('/setup/items/tag', {
      hub: north.hub, item: document, required: [north.first, 'missing'],
    })).toMatchObject({ ok: false, error: { kind: 'domain', value: 'INVALID_REQUIREMENTS' } });
    expect(await gateway.invoke('/setup/items/tag', {
      hub: north.hub, item: 'document:missing', required: [],
    })).toMatchObject({ ok: false, error: { kind: 'domain', value: 'ITEM_NOT_FOUND' } });
    expect(await tagging._rule({ item: document })).toEqual([]);
  });

  test('replaces and removes document and block rules, preserving empty versus missing', async () => {
    const { gateway } = createApplication(mongo.db());
    const { hub, start, first } = await createHub(gateway, 'North');
    const created = await gateway.invoke('/setup/documents/create', {
      hub, title: 'Atlas', blocks: [{ kind: 'TEXT', body: 'Secret', alt: '' }],
    });
    if (!created.ok) throw new Error('Document creation failed');
    const { document, blocks } = created.value as { document: string; blocks: { block: string }[] };
    const block = blocks[0]!.block;
    const tagging = new RequirementTaggingConcept(mongo.db());
    expect(await gateway.invoke('/setup/items/tag', { hub, item: document, required: [first, start] }))
      .toMatchObject({ ok: true, value: { item: document } });
    expect(await tagging._rule({ item: document })).toEqual([{ required: [first, start].sort() }]);
    expect(await gateway.invoke('/setup/items/tag', { hub, item: document, required: [] }))
      .toMatchObject({ ok: true, value: { item: document } });
    expect(await tagging._rule({ item: document })).toEqual([{ required: [] }]);
    expect(await tagging._eligible({ item: document, tokens: [] })).toEqual({ eligible: true });
    expect(await gateway.invoke('/setup/items/tag', { hub, item: block, required: [first] }))
      .toMatchObject({ ok: true, value: { item: block } });
    expect(await gateway.invoke('/setup/items/tag', { hub, item: document, required: ['bad'] }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'INVALID_REQUIREMENTS' } });
    expect(await tagging._rule({ item: document })).toEqual([{ required: [] }]);
    expect(await gateway.invoke('/setup/items/untag', { hub, item: document }))
      .toMatchObject({ ok: true, value: { item: document } });
    expect(await tagging._rule({ item: document })).toEqual([]);
    expect(await tagging._eligible({ item: document, tokens: [first] })).toEqual({ eligible: false });
    expect(await tagging._rule({ item: block })).toEqual([{ required: [first] }]);
    expect(await gateway.invoke('/setup/items/untag', { hub, item: block }))
      .toMatchObject({ ok: true, value: { item: block } });
    expect(await gateway.invoke('/setup/items/untag', { hub, item: block }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'REQUIREMENT_RULE_NOT_FOUND' } });
    expect(await gateway.invoke('/setup/items/tag', { hub, item: block, required: ['not-a-checkpoint', 1] }))
      .toMatchObject({ ok: false, error: { kind: 'framework', code: 'INVALID_INPUT' } });
  });
});
