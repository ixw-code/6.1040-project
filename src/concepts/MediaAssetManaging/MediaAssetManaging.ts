import { MongoServerError, type ClientSession, type Db } from 'mongodb';

export class MediaAssetError extends Error {
  constructor(readonly code: string) { super(code); }
}
export class InvalidAsset extends MediaAssetError { constructor() { super('INVALID_ASSET'); } }
export class StorageKeyTaken extends MediaAssetError { constructor() { super('STORAGE_KEY_TAKEN'); } }
export class AssetFilenameTaken extends MediaAssetError { constructor() { super('ASSET_FILENAME_TAKEN'); } }
export class AssetNotFound extends MediaAssetError { constructor() { super('ASSET_NOT_FOUND'); } }
export class AssetNotReady extends MediaAssetError { constructor() { super('ASSET_NOT_READY'); } }
export type AssetKind = 'IMAGE' | 'VIDEO';
export type AssetStatus = 'PENDING' | 'READY';
type AssetRecord = { _id: string; uploader: string; filename: string; storageKey: string;
  kind: AssetKind; status: AssetStatus; referenceRevision: number };

export class MediaAssetManagingConcept {
  private readonly assets;
  constructor(db: Db, private readonly session?: ClientSession) {
    this.assets = db.collection<AssetRecord>('media_assets');
  }
  async create({ uploader, filename, storageKey, kind }: { uploader: string; filename: string;
    storageKey: string; kind: AssetKind }): Promise<{ asset: string }> {
    if (typeof filename !== 'string' || !filename.trim() || !['IMAGE', 'VIDEO'].includes(kind) ||
      typeof uploader !== 'string' || !uploader || typeof storageKey !== 'string' || !storageKey) {
      throw new InvalidAsset();
    }
    const name = filename.trim();
    const asset = `asset:${crypto.randomUUID()}`;
    try {
      await this.assets.insertOne({ _id: asset, uploader, filename: name, storageKey,
        kind, status: 'PENDING', referenceRevision: 0 }, { session: this.session });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        if (await this.assets.findOne({ storageKey }, { session: this.session }))
          throw new StorageKeyTaken();
        throw new AssetFilenameTaken();
      }
      throw error;
    }
    return { asset };
  }
  async finalize({ asset }: { asset: string }): Promise<{ asset: string }> {
    const row = await this.assets.findOneAndUpdate({ _id: asset }, { $set: { status: 'READY' } },
      { session: this.session, returnDocument: 'after' });
    if (!row) throw new AssetNotFound();
    return { asset };
  }
  async confirmReadyReference({ asset, kind }: { asset: string; kind: AssetKind }): Promise<{ asset: string }> {
    const row = await this.assets.findOneAndUpdate({ _id: asset, kind, status: 'READY' },
      { $inc: { referenceRevision: 1 } }, { session: this.session, returnDocument: 'after' });
    if (!row) throw new AssetNotReady();
    return { asset };
  }
  async delete({ asset }: { asset: string }): Promise<{ asset: string }> {
    const result = await this.assets.deleteOne({ _id: asset }, { session: this.session });
    if (!result.deletedCount) throw new AssetNotFound();
    return { asset };
  }
  async _get({ asset }: { asset: string }) {
    const row = await this.assets.findOne({ _id: asset }, { session: this.session });
    return row ? [{ uploader: row.uploader, filename: row.filename, storageKey: row.storageKey,
      kind: row.kind, status: row.status }] : [];
  }
  async _uploadedBy({ uploader }: { uploader: string }) {
    const rows = await this.assets.find({ uploader }, { session: this.session }).sort({ _id: 1 }).toArray();
    return rows.map(({ _id, filename, kind, status }) => ({ asset: _id, filename, kind, status }));
  }
}
