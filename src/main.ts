import { connectMongo, type MongoConnection } from '@/db.ts';
import { createReaderHttpHandler } from '@/http/edge.ts';
import { withHealthCheck } from '@/http/health.ts';
import { stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const frontendDist = resolve(import.meta.dir, '../frontend/dist');
const frontendIndex = Bun.file(resolve(frontendDist, 'index.html'));

async function serveFrontend(request: Request): Promise<Response | undefined> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return undefined;

  const url = new URL(request.url);
  if (
    url.pathname === '/api' || url.pathname.startsWith('/api/') ||
    url.pathname === '/auth' || url.pathname.startsWith('/auth/')
  ) return undefined;

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const filePath = resolve(frontendDist, `.${pathname}`);
  const fileRelativePath = relative(frontendDist, filePath);
  if (
    fileRelativePath === '..' ||
    fileRelativePath.startsWith(`..${sep}`) ||
    isAbsolute(fileRelativePath)
  ) return new Response('Not Found', { status: 404 });

  try {
    if ((await stat(filePath)).isFile()) return new Response(Bun.file(filePath));
  } catch (error) {
    if (!(error instanceof Error && 'code' in error &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR'))) throw error;
  }

  if (request.headers.get('accept')?.includes('text/html') && await frontendIndex.exists()) {
    return new Response(frontendIndex);
  }

  return undefined;
}

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
  fetch: withHealthCheck(async (request) =>
    await serveFrontend(request) ??
    await applicationHandler?.(request) ??
    startingResponse()
  ),
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
