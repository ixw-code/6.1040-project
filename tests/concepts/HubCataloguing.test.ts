import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { describe, expect, test } from 'bun:test';
import {
  HubCataloguingConcept, HubNameRequired, HubNameTaken, HubNotFound,
  HubRenameNameRequired, HubRenameNameTaken,
} from '@/concepts/HubCataloguing/HubCataloguing.ts';

describe('HubCataloguing', () => {
  const mongo = useMongoTestDb();
  test('creates trimmed names and keeps stable hub IDs through rename', async () => {
    const c = new HubCataloguingConcept(mongo.db());
    const { hub } = await c.create({ name: '  Arcadia  ' });
    expect(await c._hub({ name: 'Arcadia' })).toEqual([{ hub }]);
    expect(await c.rename({ hub, name: '  Arcadia II ' })).toEqual({ hub });
    expect(await c._hub({ name: 'Arcadia II' })).toEqual([{ hub }]);
    expect(await c._hub({ name: 'Arcadia' })).toEqual([]);
  });

  test('rejects blank and duplicate names without changing state', async () => {
    const c = new HubCataloguingConcept(mongo.db());
    await expect(c.create({ name: '  ' })).rejects.toBeInstanceOf(HubNameRequired);
    const first = await c.create({ name: 'Arcadia' });
    await expect(c.create({ name: ' Arcadia ' })).rejects.toBeInstanceOf(HubNameTaken);
    const second = await c.create({ name: 'Other' });
    await expect(c.rename({ hub: second.hub, name: 'Arcadia' })).rejects.toBeInstanceOf(HubRenameNameTaken);
    await expect(c.rename({ hub: second.hub, name: '' })).rejects.toBeInstanceOf(HubRenameNameRequired);
    await expect(c.rename({ hub: 'missing', name: 'New' })).rejects.toBeInstanceOf(HubNotFound);
    expect(await c._hubs()).toHaveLength(2);
    expect(await c._hub({ name: 'Arcadia' })).toEqual([{ hub: first.hub }]);
    expect(await c._hub({ name: 'Other' })).toEqual([{ hub: second.hub }]);
  });

  test('names compare case-sensitively and queries return defensive records', async () => {
    const c = new HubCataloguingConcept(mongo.db());
    await c.create({ name: 'Hub' });
    await c.create({ name: 'hub' });
    const rows = await c._hubs();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.hub)).toEqual([...rows.map((r) => r.hub)].sort());
    rows[0]!.name = 'changed-outside';
    expect((await c._hubs()).some((r) => r.name === 'changed-outside')).toBe(false);
    expect(await c._hub({ name: 'missing' })).toEqual([]);
  });
});
