import { createGateway } from '@mit-sdg/sync-engine/boundary';
import { createHttpHandler } from '@mit-sdg/sync-engine-http/handler';
import type { Db } from 'mongodb';
import type { ReaderWire } from '@generated/reader/wire.ts';
import { assembleWikiplotter } from '@/assembly.ts';
import { readerHttpPolicy } from '@/http-policy.ts';
import { authOptionsFromEnvironment, createAuthHttpHandler } from '@/auth/http.ts';

export function createReaderHttpHandler(db: Db, authOptions = authOptionsFromEnvironment()) {
  const application = assembleWikiplotter(db);
  const gateway = createGateway<ReaderWire>({ application });
  const reader = createHttpHandler({ application, gateway, policy: readerHttpPolicy });
  const auth = authOptions ? createAuthHttpHandler(db, authOptions) : undefined;
  return (request: Request) => {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/accounts/') || url.pathname.startsWith('/auth/')) {
      return auth ? auth(request, url.pathname, url) :
        new Response(JSON.stringify({ error: 'AUTH_UNCONFIGURED' }), {
          status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        });
    }
    return reader(request);
  };
}
