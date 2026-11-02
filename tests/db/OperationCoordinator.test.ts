import { describe, expect, test } from 'bun:test';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { registerOperationRecovery, recoverPendingOperations, runOperation, withApplicationLock,
  type PendingOperation } from
  '@/operations/Coordinator.ts';

describe('application operation coordinator', () => {
  const mongo = useMongoTestDb();

  test('serializes readers and writers using the same application gate', async () => {
    const db = mongo.db();
    const order: string[] = [];
    let release!: () => void;
    let signalStarted!: () => void;
    const paused = new Promise<void>((resolve) => { release = resolve; });
    const started = new Promise<void>((resolve) => { signalStarted = resolve; });
    const first = withApplicationLock(db, async () => {
      order.push('writer-start');
      signalStarted();
      await paused;
      order.push('writer-end');
    });
    await started;
    const second = withApplicationLock(db, async () => { order.push('reader'); });
    expect(order).toEqual(['writer-start']);
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(['writer-start', 'writer-end', 'reader']);
  });

  test('recovers a failed multi-step operation before returning and clears its journal', async () => {
    const db = mongo.db();
    let recovered = 0;
    registerOperationRecovery(db, 'test.operation', async () => {
      recovered += 1;
      return { complete: true };
    });
    const result = await runOperation<{ complete: boolean }>({ db, kind: 'test.operation', actor: 'user:test', payload: {},
      work: async () => { throw new Error('simulated intermediate failure'); },
    });
    expect(result).toEqual({ complete: true });
    expect(recovered).toBe(1);
    expect(await db.collection('wikiplotter_operations').countDocuments({ kind: 'test.operation' })).toBe(0);
  });

  test('replays durable pending operations before ordinary work', async () => {
    const db = mongo.db();
    let recovered = 0;
    registerOperationRecovery(db, 'test.restart', async () => { recovered += 1; return {}; });
    await db.collection<PendingOperation>('wikiplotter_operations').insertOne({ _id: 'pending-test', kind: 'test.restart',
      actor: 'user:test', payload: {}, createdAt: new Date(), status: 'RUNNING' });
    await recoverPendingOperations(db);
    expect(recovered).toBe(1);
    expect(await db.collection<PendingOperation>('wikiplotter_operations').findOne({ _id: 'pending-test' })).toBeNull();
  });
});
