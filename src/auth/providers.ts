import { createHash, createPublicKey, verify } from 'node:crypto';
import type { Provider } from '@/concepts/Registering/Registering.ts';

export interface VerifiedProvider {
  readonly kind: Provider;
  authorize(input: { state: string; nonce: string; verifier: string }): string;
  redeem(input: { code: string; nonce: string; verifier: string }): Promise<string | undefined>;
}

const challenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

/** MIT SDG Commons' documented connect/redeem protocol, with S256 code binding. */
export class CommonsProvider implements VerifiedProvider {
  readonly kind = 'COMMONS';
  private readonly origin: string;
  private readonly app: string;

  constructor(origin: string, app: string, private readonly http: typeof fetch = fetch) {
    const configured = new URL(origin);
    if (configured.protocol !== 'https:') throw new Error('COMMONS_ORIGIN must use HTTPS.');
    this.origin = configured.origin;
    this.app = new URL(app).origin;
  }

  authorize({ state, verifier }: { state: string; nonce: string; verifier: string }): string {
    const url = new URL('/connect', this.origin);
    url.searchParams.set('app', this.app);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge(verifier));
    url.searchParams.set('code_challenge_method', 'S256');
    return url.href;
  }

  async redeem({ code, verifier }: { code: string; nonce: string; verifier: string }): Promise<string | undefined> {
    try {
      const response = await this.http(new URL('/api/connect/redeem', this.origin), {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, app: this.app, code_verifier: verifier }),
        redirect: 'error', signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return undefined;
      const identity = await response.json() as Record<string, unknown>;
      return typeof identity.user === 'string' && identity.user.length > 0 &&
        typeof identity.username === 'string' ? identity.user : undefined;
    } catch { return undefined; }
  }
}

type GoogleKey = { kty?: string; n?: string; e?: string; kid?: string; alg?: string; use?: string };

/** Google authorization-code OIDC; verifies the signed ID token before returning sub. */
export class GoogleProvider implements VerifiedProvider {
  readonly kind = 'GOOGLE';
  private readonly redirectUri: string;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    app: string,
    private readonly http: typeof fetch = fetch,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.redirectUri = new URL('/auth/google/callback', app).href;
  }

  authorize({ state, nonce, verifier }: { state: string; nonce: string; verifier: string }): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    for (const [key, value] of Object.entries({
      client_id: this.clientId, redirect_uri: this.redirectUri, response_type: 'code',
      scope: 'openid', state, nonce, code_challenge: challenge(verifier),
      code_challenge_method: 'S256',
    })) url.searchParams.set(key, value);
    return url.href;
  }

  async redeem({ code, nonce, verifier }: { code: string; nonce: string; verifier: string }): Promise<string | undefined> {
    try {
      const token = await this.http('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: this.clientId, client_secret: this.clientSecret,
          redirect_uri: this.redirectUri, grant_type: 'authorization_code', code_verifier: verifier,
        }),
        redirect: 'error', signal: AbortSignal.timeout(10_000),
      });
      if (!token.ok) return undefined;
      const body = await token.json() as Record<string, unknown>;
      if (typeof body.id_token !== 'string') return undefined;
      const parts = body.id_token.split('.');
      if (parts.length !== 3) return undefined;
      const header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString()) as Record<string, unknown>;
      const claims = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString()) as Record<string, unknown>;
      if (header.alg !== 'RS256' || typeof header.kid !== 'string') return undefined;
      const keysResponse = await this.http('https://www.googleapis.com/oauth2/v3/certs', {
        redirect: 'error', signal: AbortSignal.timeout(10_000),
      });
      if (!keysResponse.ok) return undefined;
      const keys = (await keysResponse.json() as { keys?: GoogleKey[] }).keys;
      const key = keys?.find((item) => item.kid === header.kid && item.kty === 'RSA' &&
        (!item.alg || item.alg === 'RS256') && (!item.use || item.use === 'sig'));
      if (!key || !verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`),
        createPublicKey({ key, format: 'jwk' }), Buffer.from(parts[2]!, 'base64url'))) return undefined;
      const now = Math.floor(this.clock().getTime() / 1000);
      if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') return undefined;
      if (claims.aud !== this.clientId || claims.nonce !== nonce ||
        typeof claims.exp !== 'number' || claims.exp <= now ||
        typeof claims.iat !== 'number' || claims.iat > now + 60 ||
        typeof claims.sub !== 'string' || !claims.sub) return undefined;
      return claims.sub;
    } catch { return undefined; }
  }
}
