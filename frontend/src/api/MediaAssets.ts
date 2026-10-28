import { postBytes, postJson } from './http.ts';

export type AssetKind = 'IMAGE' | 'VIDEO';
export type Asset = { asset: string; filename: string; kind: AssetKind; status: 'PENDING' | 'READY' };
export type UploadInput = { filename: string; kind: AssetKind; contentType: string; data: string };

export const MediaAssetsApi = {
  startUpload: (input: UploadInput) => postJson<{ asset: string }>('/assets/start', input),
  finishUpload: (asset: string) => postJson<Asset>('/assets/finish', { asset }),
  list: () => postJson<Asset[]>('/assets/my'),
  get: (asset: string) => postJson<Asset>('/assets/get', { asset }),
  preview: (asset: string) => postBytes('/assets/preview', { asset }),
  read: (hub: string, document: string, block: string) => postBytes('/assets/read', { hub, document, block }),
  delete: (asset: string) => postJson<{ asset: string }>('/assets/delete', { asset }),
};
