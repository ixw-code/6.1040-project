import { ObjectId, type Db } from 'mongodb';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { MediaAssetManagingConcept, type AssetKind } from
  '@/concepts/MediaAssetManaging/MediaAssetManaging.ts';
import { GridFsMedia } from '@/storage/GridFsMedia.ts';
import { DocumentingConcept } from '@/concepts/Documenting/Documenting.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';

const MAX_BYTES = 20 * 1024 * 1024;
export class MediaAssetsError extends Error { constructor(readonly code: string) { super(code); } }

export function detectMedia(bytes: Uint8Array): { kind: AssetKind; contentType: string } | undefined {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return { kind: 'IMAGE', contentType: 'image/png' };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { kind: 'IMAGE', contentType: 'image/jpeg' };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return { kind: 'IMAGE', contentType: 'image/webp' };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp')
    return { kind: 'VIDEO', contentType: 'video/mp4' };
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3)
    return { kind: 'VIDEO', contentType: 'video/webm' };
  return undefined;
}

export function createMediaAssets(db: Db, clock?: () => Date) {
  const store = new GridFsMedia(db);
  const metadata = () => new MediaAssetManagingConcept(db);
  async function identity(secret: string) {
    const user = (await new SessioningConcept(db, clock).use({ session: secret })).user;
    if (!(await new RegisteringConcept(db)._user({ user })).length) throw new MediaAssetsError('UNAUTHENTICATED');
    return user;
  }
  async function owned(secret: string, asset: string) {
    const user = await identity(secret);
    const row = (await metadata()._get({ asset }))[0];
    if (!row) throw new MediaAssetsError('ASSET_NOT_FOUND');
    if (row.uploader !== user) throw new MediaAssetsError('FORBIDDEN');
    return row;
  }
  async function startUpload(secret: string, filename: string, kind: AssetKind,
    contentType: string, bytes: Uint8Array) {
    const user = await identity(secret);
    if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_BYTES)
      throw new MediaAssetsError('INVALID_MEDIA');
    const detected = detectMedia(bytes);
    if (!detected || detected.kind !== kind || detected.contentType !== contentType)
      throw new MediaAssetsError('INVALID_MEDIA');
    const storageKey = new ObjectId().toHexString();
    const { asset } = await metadata().create({ uploader: user, filename, storageKey, kind });
    try { await store.put(storageKey, bytes); }
    catch (error) {
      await metadata().delete({ asset }).catch(() => {});
      await store.delete(storageKey).catch(() => {});
      throw error;
    }
    return { asset };
  }
  async function finishUpload(secret: string, asset: string) {
    const row = await owned(secret, asset);
    const bytes = await store.get(row.storageKey);
    const found = bytes && detectMedia(bytes);
    if (!bytes?.length || bytes.length > MAX_BYTES || found?.kind !== row.kind)
      throw new MediaAssetsError('INVALID_MEDIA');
    return metadata().finalize({ asset });
  }
  async function myAssets(secret: string) { return metadata()._uploadedBy({ uploader: await identity(secret) }); }
  async function getAsset(secret: string, asset: string) {
    const { filename, kind, status } = await owned(secret, asset);
    return { asset, filename, kind, status };
  }
  async function preview(secret: string, asset: string) {
    const row = await owned(secret, asset);
    if (row.status !== 'READY') throw new MediaAssetsError('ASSET_NOT_READY');
    const bytes = await store.get(row.storageKey);
    const type = bytes && detectMedia(bytes);
    if (!bytes || type?.kind !== row.kind) throw new MediaAssetsError('ASSET_NOT_READY');
    return { bytes, contentType: type.contentType, filename: row.filename };
  }
  async function deleteAsset(secret: string, asset: string) {
    await owned(secret, asset);
    const session = db.client.startSession();
    let storageKey = '';
    try {
      await session.withTransaction(async () => {
        const assets = new MediaAssetManagingConcept(db, session);
        const row = (await assets._get({ asset }))[0];
        if (!row) throw new MediaAssetsError('ASSET_NOT_FOUND');
        storageKey = row.storageKey;
        const documents = new DocumentingConcept(db, session);
        for (const { hub } of await new HubCataloguingConcept(db, session)._hubs({})) {
          for (const { document } of await documents._documents({ scope: hub })) {
            if ((await documents._blocks({ scope: hub, document })).some((block) =>
              block.kind !== 'TEXT' && block.body === asset)) throw new MediaAssetsError('ASSET_REFERENCED');
          }
        }
        await assets.delete({ asset });
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } finally { await session.endSession(); }
    // A failed byte delete leaves only private orphan bytes, never a downloadable asset.
    try { await store.delete(storageKey); } catch { /* periodic orphan cleanup may retry */ }
    return { asset };
  }
  return { StartUpload: startUpload, FinishUpload: finishUpload, MyAssets: myAssets,
    GetAsset: getAsset, PreviewAsset: preview, DeleteAsset: deleteAsset };
}
