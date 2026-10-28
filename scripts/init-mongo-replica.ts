import { MongoClient, MongoServerError } from 'mongodb';

const setName = 'wikiplotter-rs';
const url = process.env.MONGODB_URL;
const port = Number(process.env.MONGO_PORT);
if (!url || process.env.MONGO_BIND_HOST !== '127.0.0.1' ||
  !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Local replica setup requires a loopback MongoDB binding and valid MONGO_PORT.');
}
const parsed = new URL(url);
if (parsed.hostname !== '127.0.0.1' || Number(parsed.port) !== port ||
  !['wikiplotter_dev', 'wikiplotter_test_local'].includes(parsed.pathname.slice(1))) {
  throw new Error('MONGODB_URL must target the configured local port and an allowed local database.');
}

// Direct connection reaches an uninitialized member before driver discovery is possible.
parsed.searchParams.delete('replicaSet');
parsed.searchParams.set('directConnection', 'true');
const client = new MongoClient(parsed.toString(), { serverSelectionTimeoutMS: 2_000 });
try {
  let connected = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await client.connect();
      connected = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  if (!connected) throw new Error('MongoDB did not become reachable.');

  const admin = client.db('admin');
  const hello = await admin.command({ hello: 1 });
  if (hello.setName !== setName && hello.isreplicaset !== true) {
    throw new Error(`MongoDB did not start as the expected replica set ${setName}.`);
  }
  let uninitialized = false;
  try {
    const status = await admin.command({ replSetGetStatus: 1 });
    if (status.set !== setName) throw new Error('MongoDB has an unexpected replica-set identity.');
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 94) uninitialized = true;
    else throw error;
  }
  if (uninitialized) {
    await admin.command({ replSetInitiate: {
      _id: setName,
      members: [{ _id: 0, host: `localhost:${port}` }],
    } });
  }
  for (let attempt = 0; attempt < 30; attempt++) {
    const state = await admin.command({ hello: 1 });
    if (state.isWritablePrimary === true) {
      console.log(`${setName} primary ready on 127.0.0.1:${port}`);
      process.exitCode = 0;
      break;
    }
    if (attempt === 29) throw new Error('MongoDB replica set did not elect a primary.');
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
} finally {
  await client.close();
}
