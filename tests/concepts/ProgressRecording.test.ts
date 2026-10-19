import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { describe, expect, test } from 'bun:test';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording.ts';

describe('ProgressRecording', () => {
  const mongo = useMongoTestDb();
  test('distinguishes missing progress from an actual selected first checkpoint', async () => {
    const c = new ProgressRecordingConcept(mongo.db());
    expect(await c._checkpoint({ scope: 'hub1', reader: 'reader1' })).toEqual([]);
    expect(await c.record({ scope: 'hub1', reader: 'reader1', checkpoint: 'first' })).toBeUndefined();
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
