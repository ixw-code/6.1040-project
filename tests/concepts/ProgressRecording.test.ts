import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { describe, expect, test } from 'bun:test';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';

describe('ProgressRecording', () => {
  const mongo = useMongoTestDb();
  test('Beta import is atomic and persists across reconnection', async () => {
    const progress = new ProgressRecordingConcept(mongo.db());
    const results = await Promise.all(Array.from({ length: 6 }, () =>
      progress.recordIfAbsent({ scope: 'hub', reader: 'user', checkpoint: 'first' })));
    expect(results.filter(({ recorded }) => recorded)).toHaveLength(1);
    expect(await progress.recordIfAbsent({ scope: 'hub', reader: 'user', checkpoint: 'other' }))
      .toEqual({ recorded: false });
    const rebuilt = new ProgressRecordingConcept(await mongo.reconnect());
    expect(await rebuilt._checkpoint({ scope: 'hub', reader: 'user' }))
      .toEqual([{ checkpoint: 'first' }]);
    expect(await rebuilt._scopesForReader({ reader: 'user' })).toEqual([{ scope: 'hub' }]);
  });
  test('distinguishes missing progress from an actual selected first checkpoint', async () => {
    const c = new ProgressRecordingConcept(mongo.db());
    expect(await c._checkpoint({ scope: 'hub1', reader: 'reader1' })).toEqual([]);
    expect(await c.record({ scope: 'hub1', reader: 'reader1', checkpoint: 'first' })).toEqual({});
    expect(await c._checkpoint({ scope: 'hub1', reader: 'reader1' })).toEqual([{ checkpoint: 'first' }]);
  });

  test('replaces progress in either direction', async () => {
    const c = new ProgressRecordingConcept(mongo.db());
    await c.record({ scope: 'hub1', reader: 'r', checkpoint: 'late' });
    await c.record({ scope: 'hub1', reader: 'r', checkpoint: 'early' });
    expect(await c._checkpoint({ scope: 'hub1', reader: 'r' })).toEqual([{ checkpoint: 'early' }]);
  });

  test('isolates records by both reader and scope', async () => {
    const c = new ProgressRecordingConcept(mongo.db());
    await c.record({ scope: 'hub1', reader: 'alice', checkpoint: 'A' });
    await c.record({ scope: 'hub1', reader: 'bob', checkpoint: 'B' });
    await c.record({ scope: 'hub2', reader: 'alice', checkpoint: 'C' });
    expect(await c._checkpoint({ scope: 'hub1', reader: 'alice' })).toEqual([{ checkpoint: 'A' }]);
    expect(await c._checkpoint({ scope: 'hub1', reader: 'bob' })).toEqual([{ checkpoint: 'B' }]);
    expect(await c._checkpoint({ scope: 'hub2', reader: 'alice' })).toEqual([{ checkpoint: 'C' }]);
  });

  test('clears an existing record and reports false on repeated clearing', async () => {
    const c = new ProgressRecordingConcept(mongo.db());
    expect(await c.clear({ scope: 'hub1', reader: 'r' })).toEqual({ cleared: false });
    await c.record({ scope: 'hub1', reader: 'r', checkpoint: 'A' });
    expect(await c.clear({ scope: 'hub1', reader: 'r' })).toEqual({ cleared: true });
    expect(await c.clear({ scope: 'hub1', reader: 'r' })).toEqual({ cleared: false });
    expect(await c._checkpoint({ scope: 'hub1', reader: 'r' })).toEqual([]);
  });
});
