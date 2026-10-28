import { randomBytes } from 'node:crypto';
import type { Db } from 'mongodb';
import { createAccounts } from '@/accounts.ts';
import { createCookieSealer } from '@/auth/sealed-cookie.ts';
import { CommonsProvider, GoogleProvider, type VerifiedProvider } from '@/auth/providers.ts';
import type { Provider } from '@/concepts/Registering/Registering.ts';
import { importAnonymousProgress, issueProgress, progressCookie, verifiedProgress } from '@/auth/progress-cookie.ts';

const sessionName = '__Host-wikiplotter_session';
const flowName = '__Host-wikiplotter_flow';
const pendingName = '__Host-wikiplotter_pending';
const flowLifetime = 10 * 60 * 1000;
const pendingLifetime = 10 * 60 * 1000;
const random = () => randomBytes(32).toString('base64url');

export type AuthOptions = {
  origin: string;
  cookieKey: Buffer;
  providers: Partial<Record<Provider, VerifiedProvider>>;
  clock?: () => Date;
};

export function authOptionsFromEnvironment(): AuthOptions | undefined {
  const origin = process.env.PUBLIC_ORIGIN;
  const key = process.env.AUTH_COOKIE_KEY;
  if (!origin || !key) return undefined;
  const providers: AuthOptions['providers'] = {};
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.GOOGLE = new GoogleProvider(
      process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, origin,
    );
  }
  if (process.env.COMMONS_ORIGIN) {
    providers.COMMONS = new CommonsProvider(process.env.COMMONS_ORIGIN, origin);
  }
  return { origin, cookieKey: Buffer.from(key, 'base64url'), providers };
}

function cookie(request: Request, name: string): string | undefined {
  return request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function setCookie(headers: Headers, name: string, value: string, age: number) {
  headers.append('set-cookie', `${name}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`);
}

function baseHeaders(): Headers {
  return new Headers({ 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
}

function json(body: unknown, status = 200, headers = baseHeaders()): Response {
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers });
}

function redirect(location: string, headers = baseHeaders()): Response {
  headers.set('location', location);
  return new Response(null, { status: 303, headers });
}

function safeReturnTo(raw: string | null, origin: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
  const url = new URL(raw, origin);
  return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : '/';
}

function textField(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 1024;
}

async function smallJson(request: Request): Promise<Record<string, unknown> | undefined> {
  const reader = request.body?.getReader();
  if (!reader) return undefined;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString());
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown> : undefined;
  } catch { return undefined; }
}

function resultError(result: { error?: unknown }): string {
  const error = result.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    if ('value' in error && typeof error.value === 'string') return error.value;
    if ('code' in error && typeof error.code === 'string') return error.code;
  }
  return 'AUTH_FAILED';
}

/** Only this boundary can supply trusted provider identities and session secrets. */
export function createAuthHttpHandler(db: Db, options: AuthOptions) {
  const origin = new URL(options.origin).origin;
  if (new URL(options.origin).protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(new URL(options.origin).hostname)) {
    throw new Error('PUBLIC_ORIGIN must be HTTPS, except for localhost development.');
  }
  const sealer = createCookieSealer(options.cookieKey, options.clock);
  const { gateway } = createAccounts(db);

  async function revokeOld(request: Request) {
    const old = cookie(request, sessionName);
    if (old) await gateway.invoke('/accounts/logout', { session: old });
  }

  async function accountResult(path: string, input: Record<string, unknown>) {
    const result = await gateway.invoke(path, input);
    if (!result.ok) return { error: resultError(result), value: undefined };
    return { error: undefined, value: result.value as Record<string, unknown> };
  }

  return async function handle(request: Request, path: string, url: URL): Promise<Response> {
    const method = request.method;
    if (path === '/api/accounts/login' && method === 'GET') {
      const kind = url.searchParams.get('provider');
      if (kind !== 'GOOGLE' && kind !== 'COMMONS') return json({ error: 'INVALID_PROVIDER' }, 400);
      const provider = options.providers[kind];
      if (!provider) return json({ error: 'PROVIDER_UNAVAILABLE' }, 503);
      const state = random(), nonce = random(), verifier = random();
      const returnTo = safeReturnTo(url.searchParams.get('returnTo'), origin);
      const headers = baseHeaders();
      setCookie(headers, flowName, sealer.seal({ kind, state, nonce, verifier, returnTo }, flowLifetime), 600);
      return redirect(provider.authorize({ state, nonce, verifier }), headers);
    }

    const callbackKind = path === '/auth/google/callback' ? 'GOOGLE' :
      path === '/auth/commons/callback' ? 'COMMONS' : undefined;
    if (callbackKind && method === 'GET') {
      const headers = baseHeaders();
      setCookie(headers, flowName, '', 0);
      const flow = sealer.open(cookie(request, flowName) ?? '');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!flow || flow.kind !== callbackKind || !textField(flow.state) ||
        flow.state !== state || !textField(flow.nonce) || !textField(flow.verifier) ||
        !code || code.length > 2048) return json({ error: 'SIGN_IN_EXPIRED' }, 400, headers);
      const provider = options.providers[callbackKind];
      if (!provider) return json({ error: 'PROVIDER_UNAVAILABLE' }, 503, headers);
      const subject = await provider.redeem({ code, nonce: flow.nonce, verifier: flow.verifier });
      if (!subject) return json({ error: 'SIGN_IN_REFUSED' }, 401, headers);
      const account = await accountResult('/accounts/login', {
        provider: callbackKind, providerSubject: subject,
      });
      if (account.error === 'ACCOUNT_NOT_FOUND') {
        setCookie(headers, pendingName, sealer.seal({
          provider: callbackKind, subject, returnTo: flow.returnTo,
        }, pendingLifetime), 600);
        return redirect(new URL('/register', origin).href, headers);
      }
      if (account.error || !textField(account.value?.session)) {
        return json({ error: 'AUTH_FAILED' }, 500, headers);
      }
      await importAnonymousProgress(db, account.value.user as string,
        verifiedProgress(progressCookie(request), options.cookieKey, options.clock));
      await revokeOld(request);
      setCookie(headers, sessionName, account.value.session, 7 * 24 * 60 * 60);
      setCookie(headers, pendingName, '', 0);
      issueProgress(headers, {}, options.cookieKey, options.clock);
      return redirect(new URL(safeReturnTo(flow.returnTo as string, origin), origin).href, headers);
    }

    if (path === '/api/accounts/current' && method === 'GET') {
      const session = cookie(request, sessionName);
      if (!session) return json({ account: null, pending: !!sealer.open(cookie(request, pendingName) ?? '') });
      const account = await accountResult('/accounts/current', { session });
      if (account.error || !account.value) {
        const headers = baseHeaders();
        setCookie(headers, sessionName, '', 0);
        return json({ account: null, pending: !!sealer.open(cookie(request, pendingName) ?? '') }, 200, headers);
      }
      return json({ account: account.value, pending: false });
    }

    if (path.startsWith('/api/accounts/') && method === 'POST') {
      if (request.headers.get('origin') !== origin) return json({ error: 'CSRF_REJECTED' }, 403);
      const session = cookie(request, sessionName);
      if (path === '/api/accounts/logout') {
        const ended = session ? await accountResult('/accounts/logout', { session }) : undefined;
        const headers = baseHeaders();
        setCookie(headers, sessionName, '', 0);
        setCookie(headers, pendingName, '', 0);
        return json({ ended: ended?.value?.ended === true }, 200, headers);
      }
      if (path === '/api/accounts/delete') return json({ error: 'ACCOUNT_DELETION_UNAVAILABLE' }, 501);
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
        return json({ error: 'INVALID_REQUEST' }, 400);
      }
      const body = await smallJson(request);
      if (!body) return json({ error: 'INVALID_REQUEST' }, 400);
      if (path === '/api/accounts/register') {
        const pending = sealer.open(cookie(request, pendingName) ?? '');
        if (!pending || (pending.provider !== 'GOOGLE' && pending.provider !== 'COMMONS') ||
          !textField(pending.subject)) return json({ error: 'REGISTRATION_EXPIRED' }, 401);
        if (typeof body.username !== 'string') return json({ error: 'INVALID_USERNAME' }, 400);
        const registered = await accountResult('/accounts/register', {
          username: body.username, provider: pending.provider, providerSubject: pending.subject,
        });
        if (registered.error || !textField(registered.value?.session)) {
          const error = registered.error ?? 'AUTH_FAILED';
          return json({ error }, error === 'USERNAME_TAKEN' ? 409 : 400);
        }
        await importAnonymousProgress(db, registered.value.user as string,
          verifiedProgress(progressCookie(request), options.cookieKey, options.clock));
        await revokeOld(request);
        const headers = baseHeaders();
        setCookie(headers, sessionName, registered.value.session, 7 * 24 * 60 * 60);
        setCookie(headers, pendingName, '', 0);
        issueProgress(headers, {}, options.cookieKey, options.clock);
        return json({
          user: registered.value.user, username: body.username,
          redirectTo: safeReturnTo(pending.returnTo as string, origin),
        }, 201, headers);
      }
      if (path === '/api/accounts/set-username') {
        if (!session) return json({ error: 'UNAUTHENTICATED' }, 401);
        if (typeof body.username !== 'string') return json({ error: 'INVALID_USERNAME' }, 400);
        const changed = await accountResult('/accounts/set-username', { session, username: body.username });
        if (changed.error || !changed.value) {
          const error = changed.error ?? 'AUTH_FAILED';
          return json({ error }, error === 'USERNAME_TAKEN' ? 409 :
            error === 'SESSION_INVALID' ? 401 : 400);
        }
        return json({ user: changed.value.user, username: changed.value.username });
      }
    }
    return json({ error: 'NOT_FOUND' }, 404);
  };
}
