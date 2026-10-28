import { describe, expect, test } from 'bun:test';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { MediaAssetManagingConcept } from '@/concepts/MediaAssetManaging/MediaAssetManaging.ts';
import { createMediaAssets } from '@/compositions/MediaAssets.ts';
import { createArticles } from '@/compositions/Articles.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';

const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
describe('MediaAssets composition and GridFS', () => {
  const mongo = useMongoTestDb();
  test('persists pending and ready uploads, reuses references, and blocks referenced deletion', async () => {
    const db = mongo.db();
    const user = (await new RegisteringConcept(db).register({ username: 'author', provider: 'GOOGLE',
      providerSubject: 'a' })).user;
    const other = (await new RegisteringConcept(db).register({ username: 'other', provider: 'GOOGLE',
      providerSubject: 'b' })).user;
    const sessions = new SessioningConcept(db);
    const token = (await sessions.start({ user })).session;
    const otherToken = (await sessions.start({ user: other })).session;
    const media = createMediaAssets(db);
    const { asset } = await media.StartUpload(token, 'map.png', 'IMAGE', 'image/png', png);
    expect((await media.GetAsset(token, asset)).status).toBe('PENDING');
    await expect(media.PreviewAsset(token, asset)).rejects.toMatchObject({ code: 'ASSET_NOT_READY' });
    await expect(media.FinishUpload(otherToken, asset)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await media.FinishUpload(token, asset);
    await media.FinishUpload(token, asset);
    expect((await media.PreviewAsset(token, asset)).bytes).toEqual(png);
    expect(await media.MyAssets(token)).toMatchObject([{ asset, filename: 'map.png', status: 'READY' }]);
    await expect(media.StartUpload(token, 'map.png', 'IMAGE', 'image/png', png))
      .rejects.toMatchObject({ code: 'ASSET_FILENAME_TAKEN' });
    const { hub } = await new HubCataloguingConcept(db).create({ name: 'Media Hub', creator: user });
    await new CheckpointingConcept(db).create({ scope: hub, label: 'Main' });
    const articles = createArticles(db);
    const block = { kind: 'IMAGE' as const, body: asset, alt: 'Map', required: [] };
    const first = await articles.CreateArticle(token, { hub, title: 'A', blocks: [block], required: [] });
    await articles.CreateArticle(token, { hub, title: 'B', blocks: [block], required: [] });
    await expect(media.DeleteAsset(token, asset)).rejects.toMatchObject({ code: 'ASSET_REFERENCED' });
    await articles.DeleteArticle(token, hub, first.document);
    await expect(media.DeleteAsset(token, asset)).rejects.toMatchObject({ code: 'ASSET_REFERENCED' });
    const rows = await new MediaAssetManagingConcept(db)._uploadedBy({ uploader: user });
    expect(rows).toHaveLength(1);
    await mongo.reconnect();
    expect((await createMediaAssets(mongo.db()).PreviewAsset(token, asset)).bytes).toEqual(png);
  });
  test('concept enforces unique metadata and ready references', async () => {
    const concept = new MediaAssetManagingConcept(mongo.db());
    const created = await concept.create({ uploader: 'user:1', filename: 'x', storageKey: 'key1', kind: 'IMAGE' });
    await expect(concept.confirmReadyReference({ asset: created.asset, kind: 'IMAGE' }))
      .rejects.toMatchObject({ code: 'ASSET_NOT_READY' });
    await concept.finalize({ asset: created.asset });
    await concept.confirmReadyReference({ asset: created.asset, kind: 'IMAGE' });
    await expect(concept.confirmReadyReference({ asset: created.asset, kind: 'VIDEO' }))
      .rejects.toMatchObject({ code: 'ASSET_NOT_READY' });
    await expect(concept.create({ uploader: 'user:1', filename: 'x', storageKey: 'key2', kind: 'IMAGE' }))
      .rejects.toMatchObject({ code: 'ASSET_FILENAME_TAKEN' });
    await expect(concept.create({ uploader: 'user:2', filename: 'y', storageKey: 'key1', kind: 'VIDEO' }))
      .rejects.toMatchObject({ code: 'STORAGE_KEY_TAKEN' });
    await concept.delete({ asset: created.asset });
    expect(await concept._get({ asset: created.asset })).toEqual([]);
  });
  test('rejects invalid bytes and removes unreferenced bytes on deletion', async () => {
    const db = mongo.db();
    const user = (await new RegisteringConcept(db).register({ username: 'uploader', provider: 'GOOGLE',
      providerSubject: 'u' })).user;
    const token = (await new SessioningConcept(db).start({ user })).session;
    const media = createMediaAssets(db);
    await expect(media.StartUpload(token, 'bad.png', 'IMAGE', 'image/png', Uint8Array.from([1,2,3])))
      .rejects.toMatchObject({ code: 'INVALID_MEDIA' });
    const { asset } = await media.StartUpload(token, 'good.png', 'IMAGE', 'image/png', png);
    const key = (await new MediaAssetManagingConcept(db)._get({ asset }))[0]!.storageKey;
    expect(await db.collection('media_bytes.files').countDocuments()).toBe(1);
    await media.DeleteAsset(token, asset);
    expect(await db.collection('media_bytes.files').countDocuments()).toBe(0);
    expect(await new MediaAssetManagingConcept(db)._get({ asset })).toEqual([]);
    expect(key).toBeTruthy();
  });
});
