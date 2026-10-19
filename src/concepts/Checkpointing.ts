/** Ordered scoped checkpoints. */
export class SequenceNotFound extends Error {}
export class CheckpointLabelRequired extends Error {}
export class CheckpointNotFound extends Error {}
export class CheckpointRenameLabelRequired extends Error {}

type Checkpoint = { checkpoint: string; label: string };
type Sequence = { sequence: string; scope: string; checkpoints: Checkpoint[] };

export class CheckpointingConcept {
  private readonly byScope = new Map<string, Sequence>();
  private readonly byId = new Map<string, Sequence>();

  async create({ scope }: { scope: string }): Promise<{ sequence: string }> {
    let seq = this.byScope.get(scope);
    if (!seq) {
      seq = { sequence: crypto.randomUUID(), scope, checkpoints: [] };
      this.byScope.set(scope, seq);
      this.byId.set(seq.sequence, seq);
    }
    return { sequence: seq.sequence };
  }

  async append({ sequence, label }: { sequence: string; label: string }): Promise<{ checkpoint: string }> {
    const seq = this.byId.get(sequence);
    if (!seq) throw new SequenceNotFound();
    const trimmed = label.trim();
    if (!trimmed) throw new CheckpointLabelRequired();
    const checkpoint = crypto.randomUUID();
    seq.checkpoints.push({ checkpoint, label: trimmed });
    return { checkpoint };
  }

  async relabel({ scope, checkpoint, label }: {
    scope: string; checkpoint: string; label: string;
  }): Promise<{ checkpoint: string }> {
    const match = this.byScope.get(scope)?.checkpoints.find((c) => c.checkpoint === checkpoint);
    if (!match) throw new CheckpointNotFound();
    const trimmed = label.trim();
    if (!trimmed) throw new CheckpointRenameLabelRequired();
    match.label = trimmed;
    return { checkpoint };
  }

  async _sequences({ scope }: { scope: string }): Promise<{ sequence: string }[]> {
    const seq = this.byScope.get(scope);
    return seq ? [{ sequence: seq.sequence }] : [];
  }

  async _checkpoints({ scope, sequence }: {
    scope: string; sequence: string;
  }): Promise<{ checkpoint: string; label: string; position: number }[]> {
    const seq = this.byId.get(sequence);
    if (!seq || seq.scope !== scope) return [];
    return seq.checkpoints.map((c, index) => ({ ...c, position: index + 1 }));
  }

  async _prefix({ scope, sequence, checkpoint }: {
    scope: string; sequence: string; checkpoint: string;
  }): Promise<{ completed: string[] }[]> {
    const seq = this.byId.get(sequence);
    if (!seq || seq.scope !== scope) return [];
    const index = seq.checkpoints.findIndex((c) => c.checkpoint === checkpoint);
    if (index === -1) return [];
    return [{ completed: seq.checkpoints.slice(0, index + 1).map((c) => c.checkpoint) }];
  }
}

