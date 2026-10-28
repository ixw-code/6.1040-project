import { createGateway } from '@mit-sdg/sync-engine/boundary';
import { createHttpHandler } from '@mit-sdg/sync-engine-http/handler';
import type { Db } from 'mongodb';
import type { ReaderWire } from '@generated/reader/wire.ts';
import { assembleWikiplotter } from '@/assembly/assembly.ts';
import { readerHttpPolicy } from '@/http/policy.ts';
import { authOptionsFromEnvironment, createAuthHttpHandler } from '@/http/accounts.ts';
import { createReaderIdentityHttpHandler } from '@/http/reader.ts';
import { createHubsHttpHandler, hubRoutes } from '@/http/hubs.ts';

export function createReaderHttpHandler(db: Db, authOptions = authOptionsFromEnvironment()) {
  const application = assembleWikiplotter(db);
  const gateway = createGateway<ReaderWire>({ application });
  const reader = createHttpHandler({ application, gateway, policy: readerHttpPolicy });
  const snapshotPaths = new Set(['/api/hubs/list', '/api/hubs/browse', '/api/content/documents/read']);
  const readReader = async (request: Request) => {
    if (!snapshotPaths.has(new URL(request.url).pathname)) return reader(request);
    const session = db.client.startSession();
    try {
      return await session.withTransaction(async () => {
        const snapshot = assembleWikiplotter(db, session);
        const gateway = createGateway<ReaderWire>({ application: snapshot });
        const handler = createHttpHandler({ application: snapshot, gateway, policy: readerHttpPolicy });
        return handler(request.clone() as Request);
      }, { readConcern: { level: 'snapshot' } });
    } finally { await session.endSession(); }
  };
  const auth = authOptions ? createAuthHttpHandler(db, authOptions) : undefined;
  const readerIdentity = authOptions ? createReaderIdentityHttpHandler(db, authOptions, readReader) : undefined;
  const hubs = authOptions ? createHubsHttpHandler(db, authOptions) : undefined;
  const identityRoutes = new Set(['/api/progress/get', '/api/progress/record', '/api/progress/clear',
    '/api/hubs/browse', '/api/content/documents/read']);
  return async (request: Request) => {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/accounts/') || url.pathname.startsWith('/auth/')) {
      return auth ? auth(request, url.pathname, url) :
        new Response(JSON.stringify({ error: 'AUTH_UNCONFIGURED' }), {
          status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        });
    }
    if (!readerIdentity && identityRoutes.has(url.pathname)) {
      return new Response(JSON.stringify({ error: 'AUTH_UNCONFIGURED' }), {
        status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    }
    if (hubRoutes.has(url.pathname)) {
      return hubs ? (await hubs(request))! : new Response(JSON.stringify({ error: 'AUTH_UNCONFIGURED' }), {
        status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    }
    const identityResponse = await readerIdentity?.(request);
    if (identityResponse) return identityResponse;
    return readReader(request);
  };
}
