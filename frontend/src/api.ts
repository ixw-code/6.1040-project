import { ArticlesApi } from './api/Articles.ts';
import { HubsApi } from './api/Hubs.ts';
import { ReaderProgressApi } from './api/ReaderProgress.ts';

/** Compatibility facade for the current reader and hub screens. */
export const api = {
  hubs: HubsApi.list,
  createHub: HubsApi.create,
  renameHub: HubsApi.rename,
  checkpoints: HubsApi.checkpoints,
  appendCheckpoint: HubsApi.appendCheckpoint,
  relabelCheckpoint: HubsApi.relabelCheckpoint,
  progress: ReaderProgressApi.get,
  record: ReaderProgressApi.record,
  clear: ReaderProgressApi.clear,
  browse: HubsApi.browse,
  read: ArticlesApi.read,
};

export type Hub = Awaited<ReturnType<typeof api.hubs>>['hubs'][number];
export type Checkpoint = Awaited<ReturnType<typeof api.checkpoints>>['checkpoints'][number];
export type DocumentSummary = Awaited<ReturnType<typeof api.browse>>['documents'][number];
export type DocumentContent = NonNullable<Awaited<ReturnType<typeof api.read>>['content']>;

export { AccountsApi } from './api/Accounts.ts';
export { HubsApi } from './api/Hubs.ts';
export { ArticlesApi } from './api/Articles.ts';
export { ReaderProgressApi } from './api/ReaderProgress.ts';
export { MediaAssetsApi } from './api/MediaAssets.ts';
