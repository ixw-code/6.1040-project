import type { Db } from 'mongodb';
import type { AuthOptions } from '@/http/accounts.ts';
import { createHubs, HubForbidden, ManagedHubNotFound } from '@/assembly/hubs.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { SessionInvalid } from '@/concepts/Sessioning/Sessioning.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';

export const hubRoutes = new Set([
  '/api/hubs/create', '/api/hubs/rename', '/api/hubs/slug', '/api/hubs/delete',
  '/api/hubs/sequences', '/api/checkpoints/list', '/api/checkpoints/append', '/api/checkpoints/relabel',
]);
const publicRoutes = new Set(['/api/hubs/sequences', '/api/checkpoints/list']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json', 'cache-control': 'no-store',
  } });
}

function sessionCookie(request: Request): string | undefined {
  return request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith('__Host-wikiplotter_session='))
    ?.slice('__Host-wikiplotter_session='.length);
}

async function inputJson(request: Request): Promise<Record<string, unknown> | undefined> {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json' ||
    Number(request.headers.get('content-length') ?? 0) > 4096) return undefined;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown> : undefined;
  } catch { return undefined; }
}

function errorCode(result: { error?: unknown }): string {
  const error = result.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'value' in error && typeof error.value === 'string') return error.value;
  return 'INVALID_REQUEST';
}

/** Secret-bearing inputs stay at this boundary; the framework gateway remains local-only. */
export function createHubsHttpHandler(db: Db, options: AuthOptions) {
  const hubs = createHubs(db, options.clock);
  const sessions = new SessioningConcept(db, options.clock);
  const catalog = new HubCataloguingConcept(db);
  const origin = new URL(options.origin).origin;
  return async (request: Request): Promise<Response | undefined> => {
    const path = new URL(request.url).pathname;
    if (!hubRoutes.has(path)) return undefined;
    if (request.method !== 'POST') return json({ error: 'INVALID_REQUEST' }, 400);
    const input = await inputJson(request);
    if (!input) return json({ error: 'INVALID_REQUEST' }, 400);
    const keys = path === '/api/hubs/create' ? ['name', 'label']
      : path === '/api/hubs/rename' ? ['hub', 'name']
      : path === '/api/hubs/slug' ? ['hub', 'slug']
      : path === '/api/checkpoints/append' ? ['hub', 'sequence', 'label']
      : path === '/api/checkpoints/relabel' ? ['hub', 'checkpoint', 'label']
      : ['hub'];
    if (keys.some((key) => typeof input[key] !== 'string' || !(input[key] as string).trim())) {
      return json({ error: 'INVALID_REQUEST' }, 400);
    }

    let secret: string | undefined;
    if (!publicRoutes.has(path)) {
      if (request.headers.get('origin') !== origin) return json({ error: 'CSRF_REJECTED' }, 403);
      secret = sessionCookie(request);
      if (!secret) return json({ error: 'UNAUTHENTICATED' }, 401);
      let user: string;
      try { user = (await sessions.use({ session: secret })).user; }
      catch (error) {
        if (error instanceof SessionInvalid) return json({ error: 'UNAUTHENTICATED' }, 401);
        throw error;
      }
      if (path !== '/api/hubs/create') {
        const metadata = (await catalog._get({ hub: input.hub as string }))[0];
        if (!metadata) return json({ error: 'HUB_NOT_FOUND' }, 404);
        if (metadata.creator !== user) return json({ error: 'FORBIDDEN' }, 403);
      }
    }

    if (path === '/api/hubs/delete') {
      try { return json(await hubs.deleteHub(secret!, input.hub as string)); }
      catch (error) {
        if (error instanceof HubForbidden) return json({ error: 'FORBIDDEN' }, 403);
        if (error instanceof ManagedHubNotFound) return json({ error: 'HUB_NOT_FOUND' }, 404);
        if (error instanceof SessionInvalid) return json({ error: 'UNAUTHENTICATED' }, 401);
        throw error;
      }
    }

    const route = path.slice('/api'.length);
    const result = publicRoutes.has(path)
      ? await hubs.gateway.invoke(route, input)
      : await hubs.transactionalInvoke(route, { ...input, session: secret });
    if (result.ok) return json(result.value);
    const error = errorCode(result);
    const status = error.endsWith('_TAKEN') ? 409 : error.endsWith('_NOT_FOUND') ? 404
      : error === 'SESSION_INVALID' ? 401 : error === 'FORBIDDEN' ? 403 : 400;
    const publicError = status === 409 ? 'CONFLICT' : status === 404 ? 'NOT_FOUND'
      : status === 400 ? 'INVALID_REQUEST' : error;
    return json({ error: publicError }, status);
  };
}
