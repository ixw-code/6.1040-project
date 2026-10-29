import { MongoClient, type Db } from 'mongodb';

export type MongoConnection = { client: MongoClient; db: Db };

/** Fail closed before any local process can connect to the wrong database. */
export function assertMongoTarget(database: string, profile = process.env.WIKIPLOTTER_ENV ?? 'development'): void {
  const allowed = profile === 'development' ? database === 'wikiplotter_dev'
    : profile === 'production' ? database === 'wikiplotter'
    : profile === 'test' ? /^wikiplotter_test_[a-zA-Z0-9]+$/.test(database)
    : false;
  if (!allowed) throw new Error(`Refusing MongoDB database ${JSON.stringify(database)} for ${JSON.stringify(profile)} profile.`);
}

/** Indexes enforce invariants even when two requests arrive concurrently. */
export async function prepareMongo(db: Db): Promise<void> {
  assertMongoTarget(db.databaseName);
  await Promise.all([
    db.collection('hubs').createIndex({ name: 1 }, { unique: true }),
    db.collection('hubs').createIndex({ slug: 1 }, { unique: true, partialFilterExpression: { slug: { $type: 'string' } } }),
    db.collection('sequences').createIndex({ scope: 1 }, { unique: true }),
    db.collection('documents').createIndex({ scope: 1, _id: 1 }),
    db.collection('documents').createIndex(
      { scope: 1, title: 1 },
      { unique: true, partialFilterExpression: { title: { $type: 'string' } } },
    ),
    db.collection('progress').createIndex({ scope: 1, reader: 1 }, { unique: true }),
    db.collection('media_assets').createIndex({ uploader: 1, filename: 1 }, { unique: true }),
    db.collection('media_assets').createIndex({ storageKey: 1 }, { unique: true }),
  ]);
}

/** Caller owns connection lifetime; never close this client from a concept. */
export async function connectMongo(url = process.env.MONGODB_URI): Promise<MongoConnection> {
  if (!url) throw new Error('MONGODB_URI must be set to a MongoDB URI with a database name.');
  const database = decodeURIComponent(new URL(url).pathname.slice(1));
  if (!database) throw new Error('MONGODB_URI must include a database name.');
  assertMongoTarget(database);

  const parsed = new URL(url);
  if ((process.env.WIKIPLOTTER_ENV === 'development' || process.env.WIKIPLOTTER_ENV === 'test') &&
    parsed.hostname === '127.0.0.1') {
    // The advertised member is localhost inside the container at the same port.
    // Direct mode keeps the host-side Bun client on its configured loopback address.
    parsed.searchParams.set('replicaSet', 'wikiplotter-rs');
    parsed.searchParams.set('directConnection', 'true');
  }
  const client = new MongoClient(parsed.toString(), { serverSelectionTimeoutMS: 5_000 });
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
