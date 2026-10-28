import { registerConcept } from '@mit-sdg/sync-engine/assembly';
import spec from '@design/concepts/MediaAssetManaging.md' with { type: 'text' };
import { MediaAssetManagingConcept, InvalidAsset, StorageKeyTaken, AssetFilenameTaken,
  AssetNotFound, AssetNotReady } from './MediaAssetManaging.ts';

export const registration = registerConcept({
  class: MediaAssetManagingConcept,
  spec,
  refusals: { INVALID_ASSET: InvalidAsset, STORAGE_KEY_TAKEN: StorageKeyTaken,
    ASSET_FILENAME_TAKEN: AssetFilenameTaken, ASSET_NOT_FOUND: AssetNotFound,
    ASSET_NOT_READY: AssetNotReady },
});
