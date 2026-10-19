import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { describe, expect, test } from 'bun:test';
import {
  DocumentingConcept, DocumentNameRequired, DocumentNameTaken, InvalidDocumentBlocks,
  type BlockInput,
} from '@/concepts/Documenting.ts';

describe('Documenting', () => {
  const mongo = useMongoTestDb();
  test('stores blocks in input order with distinct stable IDs', async () => {
    const c = new DocumentingConcept(mongo.db());
    const inputs: BlockInput[] = [
      { kind: 'TEXT', body: 'Plot summary', alt: '' },
      { kind: 'IMAGE', body: '/scene.png', alt: 'Scene with spoilers' },
    ];
    const { document } = await c.create({ scope: 'hub1', title: '  Title  ', blocks: inputs });
    const rows = await c._blocks({ scope: 'hub1', document });
    expect(rows.map(({ kind }) => kind)).toEqual(['TITLE', 'TEXT', 'IMAGE']);
    expect(rows.map(({ body }) => body)).toEqual(['Title', 'Plot summary', '/scene.png']);
    expect(rows[2]?.alt).toBe('Scene with spoilers');
    expect(new Set(rows.map(({ block }) => block)).size).toBe(3);
    expect(rows.every(({ block }) => block.startsWith('block:'))).toBe(true);
    expect(document.startsWith('document:')).toBe(true);
    expect(await c._blocks({ scope: 'hub1', document })).toEqual(rows);
  });

  test('adds a title block to image-only and otherwise empty documents', async () => {
    const c = new DocumentingConcept(mongo.db());
    const image = await c.create({ scope: 'hub1', title: 'Map', blocks: [{ kind: 'IMAGE', body: '/map', alt: 'Map' }] });
    const empty = await c.create({ scope: 'hub1', title: 'Introduction', blocks: [] });
    expect((await c._blocks({ scope: 'hub1', document: image.document })).map(({ kind }) => kind))
      .toEqual(['TITLE', 'IMAGE']);
    expect((await c._blocks({ scope: 'hub1', document: empty.document })).map(({ body }) => body))
      .toEqual(['Introduction']);
    expect(await c._documents({ scope: 'hub1' })).toHaveLength(2);
  });

  test('enforces scoped unique titles and rejects invalid blocks', async () => {
    const c = new DocumentingConcept(mongo.db());
    await expect(c.create({ scope: 'hub1', title: '  ', blocks: [] }))
      .rejects.toBeInstanceOf(DocumentNameRequired);
    await c.create({ scope: 'hub1', title: 'Map', blocks: [] });
    await expect(c.create({ scope: 'hub1', title: ' Map ', blocks: [] }))
      .rejects.toBeInstanceOf(DocumentNameTaken);
    await c.create({ scope: 'hub2', title: 'Map', blocks: [] });
    await c.create({ scope: 'hub1', title: 'map', blocks: [] });
    await expect(c.create({ scope: 'hub1', title: 'Other', blocks: [{ kind: 'TITLE', body: 'Extra', alt: '' }] }))
      .rejects.toBeInstanceOf(InvalidDocumentBlocks);
    await expect(c.create({ scope: 'hub1', title: 'Other', blocks: [{ kind: 'IMAGE', body: '/map', alt: '  ' }] }))
      .rejects.toBeInstanceOf(InvalidDocumentBlocks);
    expect(await c._documents({ scope: 'hub1' })).toHaveLength(2);
  });

  test('enforces scope isolation and returns defensive block copies', async () => {
    const c = new DocumentingConcept(mongo.db());
    const inputs: BlockInput[] = [{ kind: 'TEXT', body: 'original', alt: '' }];
    const { document } = await c.create({ scope: 'hub1', title: 'Original', blocks: inputs });
    inputs[0]!.body = 'mutated input';
    const rows = await c._blocks({ scope: 'hub1', document });
    rows[1]!.body = 'mutated output';
    expect((await c._blocks({ scope: 'hub1', document }))[1]?.body).toBe('original');
    expect(await c._documents({ scope: 'hub2' })).toEqual([]);
    expect(await c._blocks({ scope: 'hub2', document })).toEqual([]);
    expect(await c._blocks({ scope: 'hub1', document: 'unknown' })).toEqual([]);
  });
});
