import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { describe, expect, test } from 'bun:test';
import {
  HubCataloguingConcept, HubNameRequired, HubNameTaken, HubNotFound,
  HubRenameNameRequired, HubRenameNameTaken,
  InvalidHubSlug, HubSlugTaken,
} from '@/concepts/HubCataloguing/HubCataloguing.ts';

describe('HubCataloguing', () => {
  const mongo = useMongoTestDb();
  test('creates trimmed names and keeps stable hub IDs through rename', async () => {
    const c = new HubCataloguingConcept(mongo.db());
    const { hub } = await c.create({ creator: "test-user", name: '  Arcadia  ' });
    expect(await c._hub({ name: 'Arcadia' })).toEqual([{ hub }]);
    expect(await c.rename({ hub, name: '  Arcadia II ' })).toEqual({ hub });
    expect(await c._hub({ name: 'Arcadia II' })).toEqual([{ hub }]);
    expect(await c._hub({ name: 'Arcadia' })).toEqual([]);
  });

  test('rejects blank and duplicate names without changing state', async () => {
    const c = new HubCataloguingConcept(mongo.db());
    await expect(c.create({ creator: "test-user", name: '  ' })).rejects.toBeInstanceOf(HubNameRequired);
    const first = await c.create({ creator: "test-user", name: 'Arcadia' });
    await expect(c.create({ creator: "test-user", name: ' Arcadia ' })).rejects.toBeInstanceOf(HubNameTaken);
    const second = await c.create({ creator: "test-user", name: 'Other' });
    await expect(c.rename({ hub: second.hub, name: 'Arcadia' })).rejects.toBeInstanceOf(HubRenameNameTaken);
    await expect(c.rename({ hub: second.hub, name: '' })).rejects.toBeInstanceOf(HubRenameNameRequired);
    await expect(c.rename({ hub: 'missing', name: 'New' })).rejects.toBeInstanceOf(HubNotFound);
    expect(await c._hubs()).toHaveLength(2);
    expect(await c._hub({ name: 'Arcadia' })).toEqual([{ hub: first.hub }]);
    expect(await c._hub({ name: 'Other' })).toEqual([{ hub: second.hub }]);
  });

  test('names compare case-sensitively and queries return defensive records', async () => {
    const c = new HubCataloguingConcept(mongo.db());
    await c.create({ creator: "test-user", name: 'Hub' });
    await c.create({ creator: "test-user", name: 'hub two' });
    const rows = await c._hubs();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.hub)).toEqual([...rows.map((r) => r.hub)].sort());
    rows[0]!.name = 'changed-outside';
    expect((await c._hubs()).some((r) => r.name === 'changed-outside')).toBe(false);
    expect(await c._hub({ name: 'missing' })).toEqual([]);
  });

  test('retains creator and slug through rename, enforces URL uniqueness, and deletes', async () => {
    const c = new HubCataloguingConcept(mongo.db());
    const { hub } = await c.create({ creator: 'owner', name: 'Star Harbor' });
    expect(await c._get({ hub })).toEqual([{ name: 'Star Harbor', slug: 'star-harbor', creator: 'owner' }]);
    expect(await c._bySlug({ slug: 'star-harbor' })).toEqual([{ hub }]);
    expect(await c._createdBy({ creator: 'owner' })).toEqual([{ hub }]);
    await c.rename({ hub, name: 'Renamed Harbor' });
    expect(await c._bySlug({ slug: 'star-harbor' })).toEqual([{ hub }]);
    await expect(c.updateSlug({ hub, slug: 'Bad Slug' })).rejects.toBeInstanceOf(InvalidHubSlug);
    expect(await c.updateSlug({ hub, slug: 'new-harbor' })).toEqual({ slug: 'new-harbor' });
    const other = await c.create({ creator: 'other', name: 'Other Harbor' });
    await expect(c.updateSlug({ hub: other.hub, slug: 'new-harbor' })).rejects.toBeInstanceOf(HubSlugTaken);
    await c.delete({ hub });
    expect(await c._get({ hub })).toEqual([]);
    expect(await c._bySlug({ slug: 'new-harbor' })).toEqual([]);
  });

  test('unique slug index resolves concurrent creates with different display names', async () => {
    const c = new HubCataloguingConcept(mongo.db());
    const results = await Promise.allSettled([
      c.create({ creator: 'one', name: 'Star Harbor' }),
      c.create({ creator: 'two', name: 'star harbor' }),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(rejected[0] && 'reason' in rejected[0] ? rejected[0].reason : undefined)
      .toBeInstanceOf(HubSlugTaken);
  });
});
