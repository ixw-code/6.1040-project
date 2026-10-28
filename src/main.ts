import { connectMongo } from '@/db.ts';
import { createReaderHttpHandler } from '@/http/edge.ts';

const hostname = process.env.HOST;
const port = Number(process.env.PORT);
if (!hostname || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Set HOST and PORT to a valid backend address.');
}

const connection = await connectMongo();
try {
  const server = Bun.serve({ hostname, port, fetch: createReaderHttpHandler(connection.db) });
  console.log(`Wikiplotter reader API listening on http://${hostname}:${server.port}`);

  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    server.stop();
    await connection.client.close();
  };
  process.once('SIGINT', () => { void shutdown(); });
  process.once('SIGTERM', () => { void shutdown(); });
} catch (error) {
  await connection.client.close();
  throw error;
}
