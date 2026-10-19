import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { describe, expect, test } from 'bun:test';
import { DocumentingConcept, type BlockInput } from '@/concepts/Documenting.ts';

describe('Documenting', () => {
  const mongo = useMongoTestDb();
  test('stores blocks in input order with distinct stable IDs', async () => {
    const c = new DocumentingConcept(mongo.db());
    const inputs: BlockInput[] = [
      { kind: 'TITLE', body: 'Title', alt: '' },
      { kind: 'TEXT', body: 'Plot summary', alt: '' },
      { kind: 'IMAGE', body: '/scene.png', alt: 'Scene with spoilers' },
    ];
    const { document } = await c.create({ scope: 'hub1', blocks: inputs });
    const rows = await c._blocks({ scope: 'hub1', document });
    expect(rows.map(({ kind }) => kind)).toEqual(['TITLE', 'TEXT', 'IMAGE']);
    expect(rows.map(({ body }) => body)).toEqual(['Title', 'Plot summary', '/scene.png']);
    expect(rows[2]?.alt).toBe('Scene with spoilers');
    expect(new Set(rows.map(({ block }) => block)).size).toBe(3);
    expect(await c._blocks({ scope: 'hub1', document })).toEqual(rows);
  });

  test('permits titleless, image-only, and empty documents', async () => {
    const c = new DocumentingConcept(mongo.db());
    const image = await c.create({ scope: 'hub1', blocks: [{ kind: 'IMAGE', body: '/map', alt: 'Map' }] });
    const empty = await c.create({ scope: 'hub1', blocks: [] });
    expect((await c._blocks({ scope: 'hub1', document: image.document }))[0]?.kind).toBe('IMAGE');
    expect(await c._blocks({ scope: 'hub1', document: empty.document })).toEqual([]);
    expect(await c._documents({ scope: 'hub1' })).toHaveLength(2);
  });

  test('enforces scope isolation and returns defensive block copies', async () => {
    const c = new DocumentingConcept(mongo.db());
    const inputs: BlockInput[] = [{ kind: 'TEXT', body: 'original', alt: '' }];
    const { document } = await c.create({ scope: 'hub1', blocks: inputs });
    inputs[0]!.body = 'mutated input';
    const rows = await c._blocks({ scope: 'hub1', document });
    rows[0]!.body = 'mutated output';
    expect((await c._blocks({ scope: 'hub1', document }))[0]?.body).toBe('original');
    expect(await c._documents({ scope: 'hub2' })).toEqual([]);
    expect(await c._blocks({ scope: 'hub2', document })).toEqual([]);
    expect(await c._blocks({ scope: 'hub1', document: 'unknown' })).toEqual([]);
  });
});
