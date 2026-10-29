import { readerClient, readerValue } from './readerClient.ts';

/** Missing progress requires the welcome flow; NotStarted is a real selection. */
export function needsProgressSelection(checkpoint: string | null): boolean {
  return checkpoint === null;
}

export const ReaderProgressApi = {
  async get(hub: string) { return readerValue(await readerClient.progress.get({ hub, reader: 'cookie' })); },
  async record(hub: string, checkpoint: string) {
    return readerValue(await readerClient.progress.record({ hub, reader: 'cookie', checkpoint }));
  },
  async clear(hub: string) { return readerValue(await readerClient.progress.clear({ hub, reader: 'cookie' })); },
};
