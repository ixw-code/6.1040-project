import { createHttpClient } from '@mit-sdg/sync-engine-http/client';
import type { ReaderWireHttp } from '@generated/reader/wire.ts';

const client = createHttpClient<ReaderWireHttp>({ baseUrl: '/api' });

function value<T extends object>(result: T): Exclude<T, { error: unknown }> {
  if ('error' in result) {
    throw new Error(String(result.error).replaceAll('_', ' ').toLowerCase());
  }
  return result as Exclude<T, { error: unknown }>;
}

export const api = {
  async hubs() { return value(await client.hubs.list({})); },
  async createHub(name: string, label: string) { return value(await client.hubs.create({ name, label })); },
  async renameHub(hub: string, name: string) { return value(await client.hubs.rename({ hub, name })); },
  async checkpoints(hub: string) { return value(await client.checkpoints.list({ hub })); },
  async appendCheckpoint(hub: string, sequence: string, label: string) {
    return value(await client.checkpoints.append({ hub, sequence, label }));
  },
  async relabelCheckpoint(hub: string, checkpoint: string, label: string) {
    return value(await client.checkpoints.relabel({ hub, checkpoint, label }));
  },
  async progress(hub: string, reader: string) { return value(await client.progress.get({ hub, reader })); },
  async record(hub: string, reader: string, checkpoint: string) {
    return value(await client.progress.record({ hub, reader, checkpoint }));
  },
  async clear(hub: string, reader: string) { return value(await client.progress.clear({ hub, reader })); },
  async browse(hub: string, reader: string) { return value(await client.hubs.browse({ hub, reader })); },
  async read(hub: string, reader: string, document: string) {
    return value(await client.content.documents.read({ hub, reader, document }));
  },
};

export type Hub = Awaited<ReturnType<typeof api.hubs>>['hubs'][number];
export type Checkpoint = Awaited<ReturnType<typeof api.checkpoints>>['checkpoints'][number];
export type DocumentSummary = Awaited<ReturnType<typeof api.browse>>['documents'][number];
export type DocumentContent = NonNullable<Awaited<ReturnType<typeof api.read>>['content']>;
