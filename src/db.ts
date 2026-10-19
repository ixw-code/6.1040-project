import { MongoClient, type Db } from 'mongodb';

export type MongoConnection = { client: MongoClient; db: Db };

/** Indexes enforce invariants even when two requests arrive concurrently. */
export async function prepareMongo(db: Db): Promise<void> {
  await Promise.all([
    db.collection('hubs').createIndex({ name: 1 }, { unique: true }),
    db.collection('sequences').createIndex({ scope: 1 }, { unique: true }),
    db.collection('documents').createIndex({ scope: 1, _id: 1 }),
    db.collection('documents').createIndex(
      { scope: 1, title: 1 },
      { unique: true, partialFilterExpression: { title: { $type: 'string' } } },
    ),
    db.collection('progress').createIndex({ scope: 1, reader: 1 }, { unique: true }),
  ]);
}

/** Caller owns connection lifetime; never close this client from a concept. */
export async function connectMongo(url = process.env.MONGODB_URL): Promise<MongoConnection> {
  if (!url) throw new Error('MONGODB_URL must be set to a MongoDB URI with a database name.');
  const database = decodeURIComponent(new URL(url).pathname.slice(1));
  if (!database) throw new Error('MONGODB_URL must include a database name.');

  const client = new MongoClient(url, { serverSelectionTimeoutMS: 5_000 });
  try {
    await client.connect();
    const db = client.db(database);
    await prepareMongo(db);
    return { client, db };
  } catch (error) {
    await client.close();
    throw error;
  }
}
