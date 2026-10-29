import { connectMongo, type MongoConnection } from '@/db.ts';
import { createReaderHttpHandler } from '@/http/edge.ts';
import { withHealthCheck } from '@/http/health.ts';

const hostname = process.env.HOST;
const port = Number(process.env.PORT);
if (!hostname || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Set HOST and PORT to a valid backend address.');
}

let connection: MongoConnection | undefined;
let applicationHandler: ((request: Request) => Promise<Response>) | undefined;
const startingResponse = () => Response.json({ error: 'STARTING' }, {
  status: 503,
  headers: { 'cache-control': 'no-store', 'retry-after': '1' },
});

const server = Bun.serve({
  hostname,
  port,
  fetch: withHealthCheck((request) => applicationHandler?.(request) ?? startingResponse()),
});
console.log(`Wikiplotter HTTP listener bound to http://${hostname}:${server.port}`);

let closing = false;
const shutdown = async () => {
  if (closing) return;
  closing = true;
  server.stop();
  await connection?.client.close();
};
process.once('SIGINT', () => { void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });

try {
  connection = await connectMongo();
  applicationHandler = createReaderHttpHandler(connection.db);
  console.log('Wikiplotter application is ready.');
} catch (error) {
  server.stop();
  await connection?.client.close();
  throw error;
}
