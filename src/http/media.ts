import type { Db } from 'mongodb';
import type { AuthOptions } from '@/http/accounts.ts';
import { createMediaAssets, detectMedia, MediaAssetsError } from '@/compositions/MediaAssets.ts';
import { MediaAssetError, type AssetKind } from '@/concepts/MediaAssetManaging/MediaAssetManaging.ts';
import { SessionInvalid } from '@/concepts/Sessioning/Sessioning.ts';
import { GridFsMedia } from '@/storage/GridFsMedia.ts';
import { MediaAssetManagingConcept } from '@/concepts/MediaAssetManaging/MediaAssetManaging.ts';

export const mediaRoutes = new Set(['/api/assets/start', '/api/assets/finish', '/api/assets/my',
  '/api/assets/get', '/api/assets/preview', '/api/assets/read', '/api/assets/delete']);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const cookie = (request: Request) => request.headers.get('cookie')?.split(';').map((p) => p.trim())
  .find((p) => p.startsWith('__Host-wikiplotter_session='))?.slice('__Host-wikiplotter_session='.length);
async function input(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json' ||
    Number(request.headers.get('content-length') ?? 0) > 28_000_000) return undefined;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 28_000_000) return undefined;
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  } catch { return undefined; }
}
function errorResponse(error: unknown) {
  const code = error instanceof MediaAssetsError || error instanceof MediaAssetError ? error.code
    : error instanceof SessionInvalid ? 'UNAUTHENTICATED' : undefined;
  if (!code) throw error;
  return json({ error: code }, code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403
    : code.endsWith('_NOT_FOUND') ? 404 : code === 'ASSET_REFERENCED' || code.endsWith('_TAKEN') ? 409 : 400);
}

/** Media read delegates eligibility to the same filtered reader HTTP path. */
export function createMediaHttpHandler(db: Db, options: AuthOptions,
  readArticle: (request: Request) => Promise<Response>) {
  const media = createMediaAssets(db, options.clock);
  const origin = new URL(options.origin).origin;
  return async (request: Request): Promise<Response | undefined> => {
    const path = new URL(request.url).pathname;
    if (!mediaRoutes.has(path)) return undefined;
    if (request.method !== 'POST') return json({ error: 'INVALID_REQUEST' }, 400);
    if (['/api/assets/start', '/api/assets/finish', '/api/assets/delete'].includes(path) &&
      request.headers.get('origin') !== origin) return json({ error: 'CSRF_REJECTED' }, 403);
    const body = await input(request);
    if (!body) return json({ error: 'INVALID_REQUEST' }, 400);
    const asset = body.asset;
    if (path !== '/api/assets/start' && path !== '/api/assets/my' &&
      (typeof asset !== 'string' || !asset)) return json({ error: 'INVALID_REQUEST' }, 400);
    if (path === '/api/assets/read') {
      const { hub, document, block } = body;
      if (![hub, document, block].every((v) => typeof v === 'string' && !!v))
        return json({ error: 'INVALID_REQUEST' }, 400);
      const headers = new Headers(request.headers);
      headers.set('content-type', 'application/json');
      const reading = await readArticle(new Request(new URL('/api/content/documents/read', request.url).toString(),
        { method: 'POST', headers, body: JSON.stringify({ hub, document }) }));
      if (!reading.ok) return json({ error: 'UNAVAILABLE' }, 404);
      const result = await reading.json() as { content?: { blocks?: { block: string; body: string;
        kind: string }[] } | null };
      const visible = result.content?.blocks?.find((b) => b.block === block && b.body === asset &&
        (b.kind === 'IMAGE' || b.kind === 'VIDEO'));
      if (!visible) return json({ error: 'UNAVAILABLE' }, 404);
      const row = (await new MediaAssetManagingConcept(db)._get({ asset: asset as string }))[0];
      if (!row || row.status !== 'READY' || row.kind !== visible.kind) return json({ error: 'UNAVAILABLE' }, 404);
      const bytes = await new GridFsMedia(db).get(row.storageKey);
      if (!bytes) return json({ error: 'UNAVAILABLE' }, 404);
      const type = detectMedia(bytes);
      if (type?.kind !== row.kind) return json({ error: 'UNAVAILABLE' }, 404);
      return new Response(Buffer.from(bytes), { headers: { 'content-type': type.contentType,
        'cache-control': 'private, no-store', 'content-disposition': 'inline' } });
    }
    const secret = cookie(request);
    if (!secret) return json({ error: 'UNAUTHENTICATED' }, 401);
    try {
      if (path === '/api/assets/start') {
        if (typeof body.filename !== 'string' || !['IMAGE', 'VIDEO'].includes(body.kind as string) ||
          typeof body.contentType !== 'string' || typeof body.data !== 'string' ||
          body.data.length > 27_000_000) return json({ error: 'INVALID_REQUEST' }, 400);
        const bytes = Buffer.from(body.data, 'base64');
        if (bytes.toString('base64') !== body.data) return json({ error: 'INVALID_REQUEST' }, 400);
        return json(await media.StartUpload(secret, body.filename, body.kind as AssetKind, body.contentType, bytes));
      }
      if (path === '/api/assets/finish') return json(await media.FinishUpload(secret, asset as string));
      if (path === '/api/assets/my') return json(await media.MyAssets(secret));
      if (path === '/api/assets/get') return json(await media.GetAsset(secret, asset as string));
      if (path === '/api/assets/delete') return json(await media.DeleteAsset(secret, asset as string));
      const value = await media.PreviewAsset(secret, asset as string);
      return new Response(Buffer.from(value.bytes), { headers: { 'content-type': value.contentType,
        'cache-control': 'private, no-store', 'content-disposition': 'inline' } });
    } catch (error) { return errorResponse(error); }
  };
}
