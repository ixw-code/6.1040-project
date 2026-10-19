import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { describe, expect, test } from 'bun:test';
import {
  CheckpointingConcept, SequenceNotFound, CheckpointLabelRequired,
  CheckpointNotFound, StartLabelFixed, CheckpointRenameLabelRequired,
} from '@/concepts/Checkpointing.ts';

describe('Checkpointing', () => {
  const mongo = useMongoTestDb();
  test('initialization is idempotent and creates a fixed NotStarted checkpoint', async () => {
    const c = new CheckpointingConcept(mongo.db());
    const { sequence } = await c.create({ scope: 'one', label: 'Main' });
    const start = (await c._checkpoints({ scope: 'one', sequence }))[0]!;
    expect(await c.create({ scope: 'one', label: 'Main' })).toEqual({ sequence });
    expect(await c._sequences({ scope: 'one' })).toEqual([{ sequence }]);
    expect(await c._checkpoints({ scope: 'one', sequence })).toEqual([start]);
    expect(start).toEqual({ checkpoint: expect.any(String), label: 'NotStarted', position: 0 });
    expect(await c._prefix({ scope: 'one', sequence, checkpoint: start.checkpoint })).toEqual([
      { checkpoint: start.checkpoint },
    ]);
    await expect(c.relabel({ scope: 'one', checkpoint: start.checkpoint, label: 'Other' }))
      .rejects.toBeInstanceOf(StartLabelFixed);
  });

  test('prefixes include NotStarted and the selected checkpoint', async () => {
    const c = new CheckpointingConcept(mongo.db());
    const { sequence } = await c.create({ scope: 'one', label: 'Main' });
    const { checkpoint: a } = await c.append({ sequence, label: '  Chapter 1 ' });
    const { checkpoint: b } = await c.append({ sequence, label: 'Chapter 2' });
    const start = (await c._checkpoints({ scope: 'one', sequence }))[0]!.checkpoint;
    expect(await c._checkpoints({ scope: 'one', sequence })).toEqual([
      { checkpoint: expect.any(String), label: 'NotStarted', position: 0 },
      { checkpoint: a, label: 'Chapter 1', position: 1 },
      { checkpoint: b, label: 'Chapter 2', position: 2 },
    ]);
    expect(await c._prefix({ scope: 'one', sequence, checkpoint: a })).toEqual([
      { checkpoint: start }, { checkpoint: a },
    ]);
    expect(await c._prefix({ scope: 'one', sequence, checkpoint: b })).toEqual([
      { checkpoint: start }, { checkpoint: a }, { checkpoint: b },
    ]);
  });

  test('relabel preserves checkpoint IDs, sequence order, and prefixes', async () => {
    const c = new CheckpointingConcept(mongo.db());
    const { sequence } = await c.create({ scope: 'one', label: 'Main' });
    const { checkpoint: a } = await c.append({ sequence, label: 'A' });
    const { checkpoint: b } = await c.append({ sequence, label: 'B' });
    const start = (await c._checkpoints({ scope: 'one', sequence }))[0]!.checkpoint;
    await c.relabel({ scope: 'one', checkpoint: a, label: 'Start' });
    expect(await c._prefix({ scope: 'one', sequence, checkpoint: b })).toEqual([
      { checkpoint: start }, { checkpoint: a }, { checkpoint: b },
    ]);
    expect((await c._checkpoints({ scope: 'one', sequence }))[1]?.label).toBe('Start');
  });

  test('validates all checkpoint tokens within one scoped sequence', async () => {
    const c = new CheckpointingConcept(mongo.db());
    const { sequence } = await c.create({ scope: 'one', label: 'Main' });
    const start = (await c._checkpoints({ scope: 'one', sequence }))[0]!.checkpoint;
    const { checkpoint } = await c.append({ sequence, label: 'Chapter 1' });
    expect(await c._contains({ scope: 'one', sequence, tokens: [] })).toEqual({ valid: true });
    expect(await c._contains({ scope: 'one', sequence, tokens: [start, checkpoint] })).toEqual({ valid: true });
    expect(await c._contains({ scope: 'one', sequence, tokens: [checkpoint, 'unknown'] })).toEqual({ valid: false });
    expect(await c._contains({ scope: 'other', sequence, tokens: [] })).toEqual({ valid: false });
    expect(await c._contains({ scope: 'one', sequence: 'missing', tokens: [] })).toEqual({ valid: false });
  });

  test('wrong scopes and unknown checkpoints return no rows; invalid mutations refuse', async () => {
    const c = new CheckpointingConcept(mongo.db());
    const { sequence } = await c.create({ scope: 'one', label: 'Main' });
    const { checkpoint } = await c.append({ sequence, label: 'A' });
    expect(await c._sequences({ scope: 'other' })).toEqual([]);
    expect(await c._checkpoints({ scope: 'other', sequence })).toEqual([]);
    expect(await c._prefix({ scope: 'other', sequence, checkpoint })).toEqual([]);
    expect(await c._prefix({ scope: 'one', sequence, checkpoint: 'unknown' })).toEqual([]);
    await expect(c.append({ sequence: 'wrong', label: 'X' })).rejects.toBeInstanceOf(SequenceNotFound);
    await expect(c.append({ sequence, label: '  ' })).rejects.toBeInstanceOf(CheckpointLabelRequired);
    await expect(c.relabel({ scope: 'other', checkpoint, label: 'X' })).rejects.toBeInstanceOf(CheckpointNotFound);
    await expect(c.relabel({ scope: 'one', checkpoint, label: '' })).rejects.toBeInstanceOf(CheckpointRenameLabelRequired);
    expect(await c._checkpoints({ scope: 'one', sequence })).toHaveLength(2);
  });
});
