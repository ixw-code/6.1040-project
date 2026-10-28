import type { Db } from 'mongodb';
import { createCookieSealer } from '@/auth/sealed-cookie.ts';
import { createGuestReader } from '@/assembly/guest-reader.ts';

export const progressCookieName = '__Host-wikiplotter_progress';
export const progressLifetime = 30 * 24 * 60 * 60 * 1000;
export type ProgressMap = Record<string, string>;

export function progressCookie(request: Request): string | undefined {
  return request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${progressCookieName}=`))?.slice(progressCookieName.length + 1);
}

export function verifiedProgress(raw: string | undefined, key: Buffer, clock?: () => Date): ProgressMap {
  const payload = createCookieSealer(key, clock).open(raw ?? '');
  const map = payload?.progress;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return {};
  const entries = Object.entries(map);
  if (entries.length > 24 || entries.some(([hub, checkpoint]) =>
    !hub || hub.length > 128 || typeof checkpoint !== 'string' ||
    !checkpoint || checkpoint.length > 128)) return {};
  return Object.fromEntries(entries) as ProgressMap;
}

export function issueProgress(headers: Headers, progress: ProgressMap, key: Buffer, clock?: () => Date) {
  const entries = Object.entries(progress).slice(-24);
  const value = entries.length ? createCookieSealer(key, clock).seal({ progress: Object.fromEntries(entries) }, progressLifetime) : '';
  headers.append('set-cookie', `${progressCookieName}=${value}; Path=/; Max-Age=${entries.length ? 2592000 : 0}; Secure; HttpOnly; SameSite=Lax`);
}

/** Idempotent per-hub import: the concept's atomic insert preserves account choices. */
export async function importAnonymousProgress(db: Db, user: string, progress: ProgressMap) {
  const guest = createGuestReader(db);
  for (const [hub, checkpoint] of Object.entries(progress)) {
    const imported = await guest.invoke('/internal/progress/import', { hub, reader: user, checkpoint });
    if (!imported.ok) throw new Error('PROGRESS_IMPORT_FAILED');
  }
}
