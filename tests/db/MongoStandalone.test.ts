import { describe, expect, test } from 'bun:test';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

describe('standalone MongoDB', () => {
  const mongo = useMongoTestDb();

  test('supports ordinary Wikiplotter persistence without replica-set mode', async () => {
    const db = mongo.db();
    const hello = await db.admin().command({ hello: 1 });
    expect(hello.setName).toBeUndefined();

    const collection = db.collection<{ _id: string; value: boolean }>('standalone_probe');
    await collection.insertOne({ _id: 'ready', value: true });
    expect(await collection.findOne({ _id: 'ready' })).toMatchObject({ value: true });
  });
});
