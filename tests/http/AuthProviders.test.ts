import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import { CommonsProvider, GoogleProvider } from '@/auth/providers.ts';

describe('verified provider adapters', () => {
  test('uses MIT SDG Commons connect/redeem with state and S256 verifier binding', async () => {
    let redeemed: Record<string, unknown> | undefined;
    const http = (async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe('https://class.mit-sdg.dev/api/connect/redeem');
      redeemed = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ user: 'commons-user-17', username: 'Someone' });
    }) as typeof fetch;
    const provider = new CommonsProvider('https://class.mit-sdg.dev', 'https://wiki.example', http);
    const address = new URL(provider.authorize({ state: 'state-1', nonce: 'nonce-1', verifier: 'verifier-1' }));
    expect(address.origin + address.pathname).toBe('https://class.mit-sdg.dev/connect');
    expect(address.searchParams.get('app')).toBe('https://wiki.example');
    expect(address.searchParams.get('state')).toBe('state-1');
    expect(address.searchParams.get('code_challenge_method')).toBe('S256');
    expect(address.searchParams.get('code_challenge'))
      .toBe(createHash('sha256').update('verifier-1').digest('base64url'));
    expect(await provider.redeem({ code: 'code-1', nonce: 'nonce-1', verifier: 'verifier-1' }))
      .toBe('commons-user-17');
    expect(redeemed).toEqual({ code: 'code-1', app: 'https://wiki.example', code_verifier: 'verifier-1' });
  });

  test("verifies Google's signed ID token, audience, expiry, and nonce", async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' });
    const now = new Date('2026-01-01T00:00:00.000Z');
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    let claims: Record<string, unknown> = {
      iss: 'https://accounts.google.com', aud: 'client-id', sub: 'google-subject-17',
      nonce: 'nonce-1', iat: now.getTime() / 1000, exp: now.getTime() / 1000 + 3600,
    };
    let corruptSignature = false;
    const token = () => {
      const data = `${encode({ alg: 'RS256', kid: 'test-key' })}.${encode(claims)}`;
      const signature = sign('RSA-SHA256', Buffer.from(data), privateKey);
      if (corruptSignature) signature[0] = signature[0]! ^ 1;
      return `${data}.${signature.toString('base64url')}`;
    };
    const http = (async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).includes('/token')) {
        const form = init?.body as URLSearchParams;
        expect(form.get('code_verifier')).toBe('verifier-1');
        expect(form.get('redirect_uri')).toBe('https://wiki.example/auth/google/callback');
        return Response.json({ id_token: token() });
      }
      expect(String(input)).toBe('https://www.googleapis.com/oauth2/v3/certs');
      return Response.json({ keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }] });
    }) as typeof fetch;
    const provider = new GoogleProvider('client-id', 'client-secret', 'https://wiki.example', http, () => now);
    const address = new URL(provider.authorize({ state: 'state-1', nonce: 'nonce-1', verifier: 'verifier-1' }));
    expect(address.origin + address.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(address.searchParams.get('state')).toBe('state-1');
    expect(address.searchParams.get('nonce')).toBe('nonce-1');
    expect(address.searchParams.get('scope')).toBe('openid');
    expect(await provider.redeem({ code: 'code', nonce: 'nonce-1', verifier: 'verifier-1' }))
      .toBe('google-subject-17');
    expect(await provider.redeem({ code: 'code', nonce: 'different', verifier: 'verifier-1' }))
      .toBeUndefined();
    claims = { ...claims, aud: 'another-client' };
    expect(await provider.redeem({ code: 'code', nonce: 'nonce-1', verifier: 'verifier-1' }))
      .toBeUndefined();
    claims = { ...claims, aud: 'client-id', exp: now.getTime() / 1000 };
    expect(await provider.redeem({ code: 'code', nonce: 'nonce-1', verifier: 'verifier-1' }))
      .toBeUndefined();
    claims = { ...claims, exp: now.getTime() / 1000 + 3600 };
    corruptSignature = true;
    expect(await provider.redeem({ code: 'code', nonce: 'nonce-1', verifier: 'verifier-1' }))
      .toBeUndefined();
  });
});
