import { MongoServerError, type Db } from 'mongodb';

export class SequenceNotFound extends Error {}
export class CheckpointLabelRequired extends Error {}
export class CheckpointNotFound extends Error {}
export class CheckpointRenameLabelRequired extends Error {}

type Checkpoint = { checkpoint: string; label: string };
type Sequence = { _id: string; scope: string; checkpoints: Checkpoint[] };

/** Ordered scoped checkpoints. */
export class CheckpointingConcept {
  private readonly sequences;

  constructor(db: Db) {
    this.sequences = db.collection<Sequence>('sequences');
  }

  async create({ scope }: { scope: string }): Promise<{ sequence: string }> {
    const sequence = crypto.randomUUID();
    try {
      await this.sequences.updateOne(
        { scope },
        { $setOnInsert: { _id: sequence, scope, checkpoints: [] } },
        { upsert: true },
      );
    } catch (error) {
      // A concurrent initializer can win the unique scope index.
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
    }
    const stored = await this.sequences.findOne({ scope });
    if (!stored) throw new Error('Sequence initialization did not produce a sequence.');
    return { sequence: stored._id };
  }

  async append({ sequence, label }: { sequence: string; label: string }): Promise<{ checkpoint: string }> {
    if (!(await this.sequences.findOne({ _id: sequence }, { projection: { _id: 1 } }))) {
      throw new SequenceNotFound();
    }
    const trimmed = label.trim();
    if (!trimmed) throw new CheckpointLabelRequired();
    const checkpoint = crypto.randomUUID();
    const result = await this.sequences.updateOne(
      { _id: sequence },
      { $push: { checkpoints: { checkpoint, label: trimmed } } },
    );
    if (!result.matchedCount) throw new SequenceNotFound();
    return { checkpoint };
  }

  async relabel({ scope, checkpoint, label }: {
    scope: string; checkpoint: string; label: string;
  }): Promise<{ checkpoint: string }> {
    const filter = { scope, 'checkpoints.checkpoint': checkpoint };
    if (!(await this.sequences.findOne(filter, { projection: { _id: 1 } }))) {
      throw new CheckpointNotFound();
    }
    const trimmed = label.trim();
    if (!trimmed) throw new CheckpointRenameLabelRequired();
    const result = await this.sequences.updateOne(
      filter, { $set: { 'checkpoints.$.label': trimmed } },
    );
    if (!result.matchedCount) throw new CheckpointNotFound();
    return { checkpoint };
  }

  async _sequences({ scope }: { scope: string }): Promise<{ sequence: string }[]> {
    const seq = await this.sequences.findOne({ scope });
    return seq ? [{ sequence: seq._id }] : [];
  }

  async _checkpoints({ scope, sequence }: {
    scope: string; sequence: string;
  }): Promise<{ checkpoint: string; label: string; position: number }[]> {
    const seq = await this.sequences.findOne({ scope, _id: sequence });
    return seq ? seq.checkpoints.map((c, i) => ({ ...c, position: i + 1 })) : [];
  }

  async _prefix({ scope, sequence, checkpoint }: {
    scope: string; sequence: string; checkpoint: string;
  }): Promise<{ completed: string[] }[]> {
    const seq = await this.sequences.findOne({ scope, _id: sequence });
    if (!seq) return [];
    const i = seq.checkpoints.findIndex((c) => c.checkpoint === checkpoint);
    return i === -1 ? [] : [{ completed: seq.checkpoints.slice(0, i + 1).map((c) => c.checkpoint) }];
  }
}
