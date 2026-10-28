import { createHttpClient } from '@mit-sdg/sync-engine-http/client';
import type { ReaderWireHttp } from '@generated/reader/wire.ts';

export const readerClient = createHttpClient<ReaderWireHttp>({ baseUrl: '/api' });

export function readerValue<T extends object>(result: T): Exclude<T, { error: unknown }> {
  if ('error' in result) throw new Error(String(result.error).replaceAll('_', ' ').toLowerCase());
  return result as Exclude<T, { error: unknown }>;
}
