import { GridFSBucket, ObjectId, type Db } from 'mongodb';

/** Private byte store. Keys are opaque and never included in public responses. */
export class GridFsMedia {
  private readonly bucket;
  constructor(db: Db) { this.bucket = new GridFSBucket(db, { bucketName: 'media_bytes' }); }
  async put(key: string, bytes: Uint8Array): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const stream = this.bucket.openUploadStreamWithId(new ObjectId(key), key);
      stream.on('finish', resolve).on('error', reject);
      stream.end(Buffer.from(bytes));
    });
  }
  async get(key: string): Promise<Uint8Array | undefined> {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of this.bucket.openDownloadStream(new ObjectId(key))) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks);
    } catch (error) {
      if (error instanceof Error && (error as Error & { code?: string }).code === 'ENOENT') return undefined;
      if (error instanceof Error && error.message.includes('FileNotFound')) return undefined;
      throw error;
    }
  }
  async delete(key: string): Promise<void> {
    try { await this.bucket.delete(new ObjectId(key)); }
    catch (error) {
      if (error instanceof Error && error.message.includes('FileNotFound')) return;
      throw error;
    }
  }
}
