import { describe, expect, test } from 'bun:test';
import {
  CheckpointingConcept, SequenceNotFound, CheckpointLabelRequired,
  CheckpointNotFound, CheckpointRenameLabelRequired,
} from '@/concepts/Checkpointing.ts';

describe('Checkpointing', () => {
  test('initialization is idempotent and creates no synthetic start', async () => {
    const c = new CheckpointingConcept();
    const { sequence } = await c.create({ scope: 'one' });
    expect(await c.create({ scope: 'one' })).toEqual({ sequence });
    expect(await c._sequences({ scope: 'one' })).toEqual([{ sequence }]);
    expect(await c._checkpoints({ scope: 'one', sequence })).toEqual([]);
  });

  test('prefixes are inclusive and the first checkpoint has a one-element prefix', async () => {
    const c = new CheckpointingConcept();
    const { sequence } = await c.create({ scope: 'one' });
    const { checkpoint: a } = await c.append({ sequence, label: '  Chapter 1 ' });
    const { checkpoint: b } = await c.append({ sequence, label: 'Chapter 2' });
    expect(await c._checkpoints({ scope: 'one', sequence })).toEqual([
      { checkpoint: a, label: 'Chapter 1', position: 1 },
      { checkpoint: b, label: 'Chapter 2', position: 2 },
    ]);
    expect(await c._prefix({ scope: 'one', sequence, checkpoint: a })).toEqual([{ completed: [a] }]);
    expect(await c._prefix({ scope: 'one', sequence, checkpoint: b })).toEqual([{ completed: [a, b] }]);
  });

  test('relabel preserves checkpoint IDs, sequence order, and prefixes', async () => {
    const c = new CheckpointingConcept();
    const { sequence } = await c.create({ scope: 'one' });
    const { checkpoint: a } = await c.append({ sequence, label: 'A' });
    const { checkpoint: b } = await c.append({ sequence, label: 'B' });
    await c.relabel({ scope: 'one', checkpoint: a, label: 'Start' });
    expect(await c._prefix({ scope: 'one', sequence, checkpoint: b })).toEqual([{ completed: [a, b] }]);
    expect((await c._checkpoints({ scope: 'one', sequence }))[0]?.label).toBe('Start');
  });

  test('wrong scopes and unknown checkpoints return no rows; invalid mutations refuse', async () => {
    const c = new CheckpointingConcept();
    const { sequence } = await c.create({ scope: 'one' });
    const { checkpoint } = await c.append({ sequence, label: 'A' });
    expect(await c._sequences({ scope: 'other' })).toEqual([]);
    expect(await c._checkpoints({ scope: 'other', sequence })).toEqual([]);
    expect(await c._prefix({ scope: 'other', sequence, checkpoint })).toEqual([]);
    expect(await c._prefix({ scope: 'one', sequence, checkpoint: 'unknown' })).toEqual([]);
    await expect(c.append({ sequence: 'wrong', label: 'X' })).rejects.toBeInstanceOf(SequenceNotFound);
    await expect(c.append({ sequence, label: '  ' })).rejects.toBeInstanceOf(CheckpointLabelRequired);
    await expect(c.relabel({ scope: 'other', checkpoint, label: 'X' })).rejects.toBeInstanceOf(CheckpointNotFound);
    await expect(c.relabel({ scope: 'one', checkpoint, label: '' })).rejects.toBeInstanceOf(CheckpointRenameLabelRequired);
    expect(await c._checkpoints({ scope: 'one', sequence })).toHaveLength(1);
  });
});
