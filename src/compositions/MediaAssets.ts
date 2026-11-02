import { ObjectId, type Db } from 'mongodb';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { MediaAssetManagingConcept, type AssetKind } from
  '@/concepts/MediaAssetManaging/MediaAssetManaging.ts';
import { GridFsMedia } from '@/storage/GridFsMedia.ts';
import { runOperation, withApplicationLock, registerOperationRecovery, type PendingOperation } from
  '@/operations/Coordinator.ts';

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
    return runOperation({ db, kind: 'media.upload', actor: user,
      payload: { filename, storageKey, kind },
      work: async () => {
        await store.put(storageKey, bytes);
        return metadata().create({ uploader: user, filename, storageKey, kind });
      },
      onFailure: async () => {
        const row = await db.collection<{ _id: string; uploader: string; storageKey: string }>('media_assets')
          .findOne({ uploader: user, storageKey });
        if (row) await metadata().delete({ asset: row._id });
        await store.delete(storageKey);
      },
    });
  }
  async function finishUpload(secret: string, asset: string) {
    return withApplicationLock(db, async () => {
      const row = await owned(secret, asset);
      const bytes = await store.get(row.storageKey);
      const found = bytes && detectMedia(bytes);
      if (!bytes?.length || bytes.length > MAX_BYTES || found?.kind !== row.kind)
        throw new MediaAssetsError('INVALID_MEDIA');
      return metadata().finalize({ asset });
    });
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
    const user = await identity(secret);
    const initial = await owned(secret, asset);
    return runOperation({ db, kind: 'media.delete', actor: user,
      payload: { asset, storageKey: initial.storageKey },
      prepare: async () => {
        const row = (await metadata()._get({ asset }))[0];
        if (!row) throw new MediaAssetsError('ASSET_NOT_FOUND');
        if (row.storageKey !== initial.storageKey) throw new MediaAssetsError('ASSET_NOT_FOUND');
        const referenced = await db.collection('documents').findOne({
          blocks: { $elemMatch: { kind: { $in: ['IMAGE', 'VIDEO'] }, body: asset } },
        }, { projection: { _id: 1 } });
        if (referenced) throw new MediaAssetsError('ASSET_REFERENCED');
        return row.storageKey;
      },
      work: async (storageKey) => {
        await metadata().delete({ asset });
        await store.delete(storageKey);
        return { asset };
      },
    });
  }

  registerOperationRecovery(db, 'media.upload', async (operation: PendingOperation) => {
    const { filename, storageKey } = operation.payload as { filename: string; storageKey: string };
    const row = await db.collection<{ _id: string; uploader: string; storageKey: string }>('media_assets')
      .findOne({ uploader: operation.actor, storageKey });
    const bytes = await store.get(storageKey);
    if (row && bytes?.length) return { asset: row._id };
    if (row) await metadata().delete({ asset: row._id as string }).catch(() => {});
    await store.delete(storageKey).catch(() => {});
    return { filename, recovered: true };
  });
  registerOperationRecovery(db, 'media.delete', async (operation: PendingOperation) => {
    const { asset, storageKey } = operation.payload as { asset: string; storageKey: string };
    const row = (await metadata()._get({ asset }))[0];
    if (row) {
      const referenced = await db.collection('documents').findOne({
        blocks: { $elemMatch: { kind: { $in: ['IMAGE', 'VIDEO'] }, body: asset } },
      }, { projection: { _id: 1 } });
      if (referenced) throw new MediaAssetsError('ASSET_REFERENCED');
      await metadata().delete({ asset });
    }
    await store.delete(storageKey);
    return { asset };
  });
  return { StartUpload: startUpload, FinishUpload: finishUpload, MyAssets: myAssets,
    GetAsset: getAsset, PreviewAsset: preview, DeleteAsset: deleteAsset };
}
