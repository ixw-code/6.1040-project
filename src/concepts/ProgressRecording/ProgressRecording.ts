import { MongoServerError, type Db } from 'mongodb';

/** Progress checkpoints in scope for opaque reader IDs. */
type ProgressRecord = { scope: string; reader: string; checkpoint: string };

export class ProgressRecordingConcept {
  private readonly progress;

  constructor(db: Db) {
    this.progress = db.collection<ProgressRecord>('progress');
  }

  async record({ scope, reader, checkpoint }: {
    scope: string; reader: string; checkpoint: string;
  }): Promise<Record<string, never>> {
    try {
      await this.progress.updateOne(
        { scope, reader },
        { $set: { checkpoint } },
        { upsert: true },
      );
    } catch (error) {
      // If two writers both upsert the same (scope, reader), update the winner's row.
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
      const result = await this.progress.updateOne({ scope, reader }, { $set: { checkpoint } });
      if (!result.matchedCount) throw error;
    }
    return {};
  }

  async clear({ scope, reader }: { scope: string; reader: string }): Promise<{ cleared: boolean }> {
    const result = await this.progress.deleteOne({ scope, reader });
    return { cleared: result.deletedCount === 1 };
  }

  async recordIfAbsent({ scope, reader, checkpoint }: {
    scope: string; reader: string; checkpoint: string;
  }): Promise<{ recorded: boolean }> {
    try {
      const result = await this.progress.updateOne(
        { scope, reader }, { $setOnInsert: { scope, reader, checkpoint } }, { upsert: true },
      );
      return { recorded: result.upsertedCount === 1 };
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) return { recorded: false };
      throw error;
    }
  }

  async clearScope({ scope }: { scope: string }): Promise<Record<string, never>> {
    await this.progress.deleteMany({ scope });
    return {};
  }

  async _scopesForReader({ reader }: { reader: string }): Promise<{ scope: string }[]> {
    const rows = await this.progress.find({ reader }, { projection: { scope: 1 } }).sort({ scope: 1 }).toArray();
    return rows.map(({ scope }) => ({ scope }));
  }

  async _checkpoint({ scope, reader }: {
    scope: string; reader: string;
  }): Promise<{ checkpoint: string }[]> {
    const row = await this.progress.findOne({ scope, reader });
    return row ? [{ checkpoint: row.checkpoint }] : [];
  }
}
