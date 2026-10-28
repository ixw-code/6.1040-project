import { createHttpClient } from '@mit-sdg/sync-engine-http/client';
import type { ReaderWireHttp } from '@generated/reader/wire.ts';

const client = createHttpClient<ReaderWireHttp>({ baseUrl: '/api' });

async function protectedPost<T>(path: string, input: object): Promise<T> {
  const response = await fetch(`/api${path}`, { method: 'POST', credentials: 'same-origin',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
  const body = await response.json() as T & { error?: string };
  if (!response.ok || body.error) throw new Error(body.error ?? 'REQUEST_FAILED');
  return body;
}

type HubCreated = { hub: string; sequence: string };
type CheckpointRow = { checkpoint: string; label: string; position: number };

function value<T extends object>(result: T): Exclude<T, { error: unknown }> {
  if ('error' in result) {
    throw new Error(String(result.error).replaceAll('_', ' ').toLowerCase());
  }
  return result as Exclude<T, { error: unknown }>;
}

export const api = {
  async hubs() { return value(await client.hubs.list({})); },
  async createHub(name: string, label: string) { return protectedPost<HubCreated>('/hubs/create', { name, label }); },
  async renameHub(hub: string, name: string) { return protectedPost<{ hub: string }>('/hubs/rename', { hub, name }); },
  async checkpoints(hub: string) { return protectedPost<{ sequence: string; checkpoints: CheckpointRow[] }>(
    '/checkpoints/list', { hub }); },
  async appendCheckpoint(hub: string, sequence: string, label: string) {
    return protectedPost<{ checkpoint: string }>('/checkpoints/append', { hub, sequence, label });
  },
  async relabelCheckpoint(hub: string, checkpoint: string, label: string) {
    return protectedPost<{ checkpoint: string }>('/checkpoints/relabel', { hub, checkpoint, label });
  },
  async progress(hub: string) { return value(await client.progress.get({ hub, reader: 'cookie' })); },
  async record(hub: string, checkpoint: string) {
    return value(await client.progress.record({ hub, reader: 'cookie', checkpoint }));
  },
  async clear(hub: string) { return value(await client.progress.clear({ hub, reader: 'cookie' })); },
  async browse(hub: string) { return value(await client.hubs.browse({ hub, reader: 'cookie' })); },
  async read(hub: string, document: string) {
    return value(await client.articles.read({ hub, reader: 'cookie', document }));
  },
};

export type Hub = Awaited<ReturnType<typeof api.hubs>>['hubs'][number];
export type Checkpoint = Awaited<ReturnType<typeof api.checkpoints>>['checkpoints'][number];
export type DocumentSummary = Awaited<ReturnType<typeof api.browse>>['documents'][number];
export type DocumentContent = NonNullable<Awaited<ReturnType<typeof api.read>>['content']>;
