import { readerClient, readerValue } from './readerClient.ts';
import { postJson } from './http.ts';

export type HubCreated = { hub: string; sequence: string };
export type CheckpointRow = { checkpoint: string; label: string; position: number };
export type HubDirectory = Awaited<ReturnType<typeof readerClient.hubs.list>>;

export const HubsApi = {
  async list() { return readerValue(await readerClient.hubs.list({})); },
  async browse(hub: string) { return readerValue(await readerClient.hubs.browse({ hub, reader: 'cookie' })); },
  create: (name: string, label: string) => postJson<HubCreated>('/hubs/create', { name, label }),
  rename: (hub: string, name: string) => postJson<{ hub: string }>('/hubs/rename', { hub, name }),
  updateSlug: (hub: string, slug: string) => postJson<{ hub: string; slug: string }>('/hubs/slug', { hub, slug }),
  delete: (hub: string) => postJson<{ hub: string }>('/hubs/delete', { hub }),
  sequences: (hub: string) => postJson<{ sequences: { sequence: string }[] }>('/hubs/sequences', { hub }),
  checkpoints: (hub: string) => postJson<{ sequence: string; checkpoints: CheckpointRow[] }>('/checkpoints/list', { hub }),
  appendCheckpoint: (hub: string, sequence: string, label: string) =>
    postJson<{ checkpoint: string }>('/checkpoints/append', { hub, sequence, label }),
  relabelCheckpoint: (hub: string, checkpoint: string, label: string) =>
    postJson<{ checkpoint: string }>('/checkpoints/relabel', { hub, checkpoint, label }),
};
