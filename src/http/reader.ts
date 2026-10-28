import type { Db } from 'mongodb';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { createGuestReader } from '@/assembly/guest-reader.ts';
import { issueProgress, progressCookie, verifiedProgress } from '@/auth/progress-cookie.ts';

type Options = { origin: string; cookieKey: Buffer; clock?: () => Date };
const routes = new Set(['/api/progress/get', '/api/progress/record', '/api/progress/clear',
  '/api/hubs/browse', '/api/content/documents/read']);

function response(body: unknown, status = 200, headers = new Headers()) {
  headers.set('content-type', 'application/json');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
}

export function createReaderIdentityHttpHandler(db: Db, options: Options,
  alphaReader: (request: Request) => Response | Promise<Response>) {
  const guest = createGuestReader(db);
  const sessions = new SessioningConcept(db, options.clock);
  const origin = new URL(options.origin).origin;
  return async (request: Request): Promise<Response | undefined> => {
    const path = new URL(request.url).pathname;
    if (!routes.has(path)) return undefined;
    if (request.method !== 'POST' || request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
      return response({ error: 'INVALID_REQUEST' }, 400);
    }
    let input: Record<string, unknown>;
    try {
      if (Number(request.headers.get('content-length') ?? 0) > 4096) throw Error();
      const raw = await request.text();
      if (raw.length > 4096) throw Error();
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error();
      input = parsed as Record<string, unknown>;
    } catch { return response({ error: 'INVALID_REQUEST' }, 400); }
    if (typeof input.hub !== 'string' || !input.hub.trim() ||
      (path === '/api/progress/record' && (typeof input.checkpoint !== 'string' || !input.checkpoint.trim())) ||
      (path === '/api/content/documents/read' && (typeof input.document !== 'string' || !input.document.trim()))) {
      return response({ error: 'INVALID_REQUEST' }, 400);
    }
    if ((path === '/api/progress/record' || path === '/api/progress/clear') &&
      request.headers.get('origin') !== origin) return response({ error: 'CSRF_REJECTED' }, 403);

    const session = request.headers.get('cookie')?.split(';').map((part) => part.trim())
      .find((part) => part.startsWith('__Host-wikiplotter_session='))?.split('=')[1];
    if (session) {
      let user: string;
      try { user = (await sessions.use({ session })).user; }
      catch { return response({ error: 'UNAUTHENTICATED' }, 401); }
      const headers = new Headers(request.headers);
      headers.set('content-type', 'application/json');
      const trusted = new Request(request.url, { method: 'POST', headers,
        body: JSON.stringify({ ...input, reader: user }) });
      return alphaReader(trusted);
    }

    const progress = verifiedProgress(progressCookie(request), options.cookieKey, options.clock);
    const hub = input.hub;
    const found = await guest.invoke('/internal/progress/hub-exists', { hub });
    if (!found.ok || !(found.value as { exists: boolean }).exists) {
      return response({ error: 'NOT_FOUND' }, 404);
    }
    const checkpoint = progress[hub];
    let selected: string | undefined;
    if (checkpoint) {
      const valid = await guest.invoke('/internal/progress/validate', { hub, checkpoint });
      if (valid.ok && (valid.value as { valid: boolean }).valid) selected = checkpoint;
    }
    if (path === '/api/progress/get') return response({ checkpoint: selected ?? null });
    if (path === '/api/progress/record') {
      const valid = await guest.invoke('/internal/progress/validate', { hub, checkpoint: input.checkpoint });
      if (!valid.ok || !(valid.value as { valid: boolean }).valid) {
        return response({ error: 'NOT_FOUND' }, 404);
      }
      const updated = { ...progress, [hub]: input.checkpoint as string };
      const headers = new Headers();
      issueProgress(headers, updated, options.cookieKey, options.clock);
      if ((headers.get('set-cookie')?.length ?? 0) > 4096) return response({ error: 'INVALID_REQUEST' }, 400);
      return response({ checkpoint: input.checkpoint }, 200, headers);
    }
    if (path === '/api/progress/clear') {
      const headers = new Headers();
      const updated = { ...progress };
      delete updated[hub];
      issueProgress(headers, updated, options.cookieKey, options.clock);
      return response({ cleared: !!selected }, 200, headers);
    }
    if (!selected) return response({ error: 'INVALID_REQUEST' }, 400);
    const result = await guest.invoke(path === '/api/hubs/browse' ? '/internal/guest/browse' : '/internal/guest/read',
      { hub, checkpoint: selected, document: input.document });
    if (!result.ok) return response({ error: 'INVALID_REQUEST' }, 400);
    const value = result.value as Record<string, unknown>;
    if (value.error === 'HUB_NOT_FOUND') return response({ error: 'NOT_FOUND' }, 404);
    if (value.error) return response({ error: 'INVALID_REQUEST' }, 400);
    return response(value);
  };
}
