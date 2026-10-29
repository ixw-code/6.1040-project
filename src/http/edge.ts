import { createGateway } from '@mit-sdg/sync-engine/boundary';
import { createHttpHandler } from '@mit-sdg/sync-engine-http/handler';
import type { Db } from 'mongodb';
import { assembleWikiplotter } from '@/assembly/assembly.ts';
import { readerHttpPolicy } from '@/http/policy.ts';
import { authOptionsFromEnvironment, createAuthHttpHandler } from '@/http/accounts.ts';
import { createReaderIdentityHttpHandler } from '@/http/reader.ts';
import { createHubsHttpHandler, hubRoutes } from '@/http/hubs.ts';
import { createArticlesHttpHandler, articleRoutes } from '@/http/articles.ts';
import { createMediaHttpHandler, mediaRoutes } from '@/http/media.ts';
import { healthResponse } from '@/http/health.ts';

export function createReaderHttpHandler(db: Db, authOptions = authOptionsFromEnvironment()) {
  const application = assembleWikiplotter(db);
  const gateway = createGateway({ application });
  const reader = createHttpHandler({ application, gateway, policy: readerHttpPolicy });
  const snapshotPaths = new Set(['/api/hubs/list', '/api/hubs/browse', '/api/articles/read']);
  const readReader = async (request: Request) => {
    if (!snapshotPaths.has(new URL(request.url).pathname)) return reader(request);
    const session = db.client.startSession();
    try {
      return await session.withTransaction(async () => {
        const snapshot = assembleWikiplotter(db, session);
        const gateway = createGateway({ application: snapshot });
        const handler = createHttpHandler({ application: snapshot, gateway, policy: readerHttpPolicy });
        return handler(request.clone() as Request);
      }, { readConcern: { level: 'snapshot' } });
    } finally { await session.endSession(); }
  };
  const auth = authOptions ? createAuthHttpHandler(db, authOptions) : undefined;
  const readerIdentity = authOptions ? createReaderIdentityHttpHandler(db, authOptions, readReader) : undefined;
  const hubs = authOptions ? createHubsHttpHandler(db, authOptions) : undefined;
  const articles = authOptions ? createArticlesHttpHandler(db, authOptions) : undefined;
  const media = authOptions ? createMediaHttpHandler(db, authOptions, async (request) =>
    (await readerIdentity?.(request)) ?? await readReader(request)) : undefined;
  const identityRoutes = new Set(['/api/progress/get', '/api/progress/record', '/api/progress/clear',
    '/api/hubs/browse', '/api/articles/read']);
  return async (request: Request) => {
    const health = healthResponse(request);
    if (health) return health;
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/internal/')) {
      return new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
        status: 404, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    }
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
    if (articleRoutes.has(url.pathname)) {
      return articles ? (await articles(request))! : new Response(JSON.stringify({ error: 'AUTH_UNCONFIGURED' }), {
        status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    }
    if (mediaRoutes.has(url.pathname)) {
      return media ? (await media(request))! : new Response(JSON.stringify({ error: 'AUTH_UNCONFIGURED' }), {
        status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    }
    const identityResponse = await readerIdentity?.(request);
    if (identityResponse) return identityResponse;
    return readReader(request);
  };
}
