import type { Db } from 'mongodb';
import type { AuthOptions } from '@/http/accounts.ts';
import { createArticles, ArticleError, type RuleBlock } from '@/compositions/Articles.ts';
import { SessionInvalid } from '@/concepts/Sessioning/Sessioning.ts';
import { DocumentTitleRequired, DocumentTitleTaken, InvalidDocumentBlocks, DocumentNotFound } from
  '@/concepts/Documenting/Documenting.ts';
import { RequirementRuleNotFound } from '@/concepts/RequirementTagging/RequirementTagging.ts';

export const articleRoutes = new Set([
  '/api/articles/create', '/api/articles/editing', '/api/articles/save',
  '/api/articles/tag', '/api/articles/untag', '/api/articles/delete',
]);

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
    Number(request.headers.get('content-length') ?? 0) > 262144) return undefined;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 262144) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown> : undefined;
  } catch { return undefined; }
}

function errorResponse(error: unknown): Response {
  if (error instanceof SessionInvalid) return json({ error: 'UNAUTHENTICATED' }, 401);
  const code = error instanceof ArticleError ? error.code
    : error instanceof DocumentTitleTaken ? 'DOCUMENT_TITLE_TAKEN'
    : error instanceof DocumentTitleRequired ? 'DOCUMENT_TITLE_REQUIRED'
    : error instanceof InvalidDocumentBlocks ? 'INVALID_DOCUMENT_BLOCKS'
    : error instanceof DocumentNotFound ? 'ARTICLE_NOT_FOUND'
    : error instanceof RequirementRuleNotFound ? 'RULE_NOT_FOUND' : undefined;
  if (!code) throw error;
  const status = code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403
    : code.endsWith('_NOT_FOUND') ? 404 : code.endsWith('_TAKEN') ? 409
    : code === 'ASSET_NOT_READY' ? 422 : 400;
  return json({ error: code }, status);
}

/** The cookie is the only author identity input; bodies contain article data only. */
export function createArticlesHttpHandler(db: Db, options: AuthOptions) {
  const articles = createArticles(db, options.clock);
  const origin = new URL(options.origin).origin;
  return async (request: Request): Promise<Response | undefined> => {
    const path = new URL(request.url).pathname;
    if (!articleRoutes.has(path)) return undefined;
    if (request.method !== 'POST') return json({ error: 'INVALID_REQUEST' }, 400);
    if (path !== '/api/articles/editing' && request.headers.get('origin') !== origin) {
      return json({ error: 'CSRF_REJECTED' }, 403);
    }
    const secret = sessionCookie(request);
    if (!secret) return json({ error: 'UNAUTHENTICATED' }, 401);
    const input = await inputJson(request);
    if (!input) return json({ error: 'INVALID_REQUEST' }, 400);
    const hub = input.hub, document = input.document, item = input.item;
    if (typeof hub !== 'string' || !hub.trim() ||
      (path !== '/api/articles/create' && (typeof document !== 'string' || !document.trim())) ||
      ((path === '/api/articles/tag' || path === '/api/articles/untag') &&
        (typeof item !== 'string' || !item.trim()))) return json({ error: 'INVALID_REQUEST' }, 400);
    try {
      if (path === '/api/articles/create') return json(await articles.CreateArticle(secret, {
        hub, title: input.title as string, blocks: input.blocks as RuleBlock[], required: input.required as string[],
      }));
      if (path === '/api/articles/editing') return json(await articles.EditingView(secret, hub, document as string));
      if (path === '/api/articles/save') return json(await articles.SaveArticle(secret, {
        hub, document: document as string, title: input.title as string | undefined,
        blocks: input.blocks as RuleBlock[], required: input.required as string[],
      }));
      if (path === '/api/articles/tag') return json(await articles.TagItem(secret, hub, document as string,
        item as string, input.required as string[]));
      if (path === '/api/articles/untag') return json(await articles.UntagItem(secret, hub, document as string,
        item as string));
      return json(await articles.DeleteArticle(secret, hub, document as string));
    } catch (error) { return errorResponse(error); }
  };
}
