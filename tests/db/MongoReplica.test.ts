import { describe, expect, test } from 'bun:test';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

describe('local MongoDB replica set', () => {
  const mongo = useMongoTestDb();

  test('is primary and commits or rolls back multi-document transactions', async () => {
    const db = mongo.db();
    const hello = await db.admin().command({ hello: 1 });
    expect(hello.setName).toBe('wikiplotter-rs');
    expect(hello.isWritablePrimary).toBe(true);
    const rows = db.collection<{ _id: string; value: string }>('transaction_probe');
    const session = mongo.client().startSession();
    try {
      await session.withTransaction(async () => {
        await rows.insertOne({ _id: 'committed', value: 'yes' }, { session });
      });
      expect(await rows.findOne({ _id: 'committed' })).toMatchObject({ value: 'yes' });

      await expect(session.withTransaction(async () => {
        await rows.insertOne({ _id: 'rolled-back', value: 'no' }, { session });
        throw new Error('abort probe');
      })).rejects.toThrow('abort probe');
      expect(await rows.findOne({ _id: 'rolled-back' })).toBeNull();
    } finally {
      await session.endSession();
    }
  });
});
