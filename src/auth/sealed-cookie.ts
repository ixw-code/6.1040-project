import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** Short-lived authenticated encryption for the OAuth attempt and pending identity. */
export function createCookieSealer(key: Buffer, clock: () => Date = () => new Date()) {
  if (key.length !== 32) throw new Error('AUTH_COOKIE_KEY must decode to 32 bytes.');
  return {
    seal(value: Record<string, unknown>, lifetimeMs: number): string {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const clear = Buffer.from(JSON.stringify({ ...value, expiresAt: clock().getTime() + lifetimeMs }));
      return Buffer.concat([iv, cipher.update(clear), cipher.final(), cipher.getAuthTag()]).toString('base64url');
    },
    open(value: string): Record<string, unknown> | undefined {
      try {
        const bytes = Buffer.from(value, 'base64url');
        if (bytes.length < 29 || bytes.length > 4096) return undefined;
        const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
        decipher.setAuthTag(bytes.subarray(-16));
        const clear = Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]);
        const payload = JSON.parse(clear.toString()) as Record<string, unknown>;
        return typeof payload.expiresAt === 'number' && payload.expiresAt > clock().getTime()
          ? payload : undefined;
      } catch { return undefined; }
    },
  };
}
