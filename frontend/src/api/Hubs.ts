import { readerClient, readerValue } from './readerClient.ts';
import { postJson } from './http.ts';
import { rememberArticleDirectory, rememberHubDirectory, rememberHubSlug } from '@/lib/routes.ts';

export type HubCreated = { hub: string; sequence: string };
export type CheckpointRow = { checkpoint: string; label: string; position: number };
export type HubDirectory = Awaited<ReturnType<typeof readerClient.hubs.list>>;

/** A valid progress selection always starts at the sequence's fixed NotStarted checkpoint. */
export function notStartedCheckpoint(checkpoints: CheckpointRow[]): string | undefined {
  return checkpoints.find((row) => row.position === 0)?.checkpoint;
}

export function selectedCheckpointLabel(
  checkpoint: string | null,
  checkpoints: CheckpointRow[],
): string | null {
  return checkpoints.find((row) => row.checkpoint === checkpoint)?.label ?? null;
}

/** Empty rules mean no additional checkpoint requirement; present that baseline in the editor. */
export function requirementCheckpointValue(required: string[], checkpoints: CheckpointRow[]): string {
  return required[0] ?? notStartedCheckpoint(checkpoints) ?? '';
}

export const HubsApi = {
  async list() {
    const result = readerValue(await readerClient.hubs.list({}));
    rememberHubDirectory(result.hubs);
    return result;
  },
  async browse(hub: string) {
    const result = readerValue(await readerClient.hubs.browse({ hub, reader: 'cookie' }));
    rememberArticleDirectory(hub, result.documents);
    return result;
  },
  create: (name: string, label: string) => postJson<HubCreated>('/hubs/create', { name, label }),
  rename: (hub: string, name: string) => postJson<{ hub: string }>('/hubs/rename', { hub, name }),
  async updateSlug(hub: string, slug: string) {
    const result = await postJson<{ slug: string }>('/hubs/slug', { hub, slug });
    rememberHubSlug(hub, result.slug);
    return result;
  },
  access: (hub: string) => postJson<{ canManage: boolean }>('/hubs/access', { hub }),
  delete: (hub: string) => postJson<{ hub: string }>('/hubs/delete', { hub }),
  sequences: (hub: string) => postJson<{ sequences: { sequence: string }[] }>('/hubs/sequences', { hub }),
  checkpoints: (hub: string) => postJson<{ sequence: string; checkpoints: CheckpointRow[] }>('/checkpoints/list', { hub }),
  appendCheckpoint: (hub: string, sequence: string, label: string) =>
    postJson<{ checkpoint: string }>('/checkpoints/append', { hub, sequence, label }),
  relabelCheckpoint: (hub: string, checkpoint: string, label: string) =>
    postJson<{ checkpoint: string }>('/checkpoints/relabel', { hub, checkpoint, label }),
};
