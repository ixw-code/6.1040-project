import { afterEach, beforeEach } from 'bun:test';
import type { Db } from 'mongodb';
import { connectMongo, type MongoConnection } from '@/db.ts';

/** Each test gets an isolated disposable DB; refuses non-test URIs. */
export function useMongoTestDb() {
  let connection: MongoConnection | undefined;
  let disposableUrl: string | undefined;

  beforeEach(async () => {
    const raw = process.env.MONGODB_URL;
    if (!raw) throw new Error('Set MONGODB_URL to a wikiplotter_test_* database URL.');
    const parsed = new URL(raw);
    const databaseName = decodeURIComponent(parsed.pathname.slice(1));
    if (!/^wikiplotter_test_[a-zA-Z0-9]+$/.test(databaseName)) {
      throw new Error('Refusing MongoDB tests: MONGODB_URL database must match wikiplotter_test_*.');
    }
    parsed.pathname = `/wikiplotter_test_${crypto.randomUUID().replaceAll('-', '')}`;
    disposableUrl = parsed.toString();
    connection = await connectMongo(disposableUrl);
  });

  afterEach(async () => {
    if (!connection) return;
    try {
      await connection.db.dropDatabase();
    } finally {
      await connection.client.close();
      connection = undefined;
    }
  });

  return {
    db(): Db {
      if (!connection) throw new Error('Mongo test database not initialized.');
      return connection.db;
    },
    async reconnect(): Promise<Db> {
      if (!connection || !disposableUrl) throw new Error('Mongo test database not initialized.');
      await connection.client.close();
      connection = await connectMongo(disposableUrl);
      return connection.db;
    },
  };
}
