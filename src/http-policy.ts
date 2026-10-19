import { httpPolicy } from '@mit-sdg/sync-engine-http/policy';

/** Publish only reader-assembly refusals through the adapter's HTTP categories. */
export const readerHttpPolicy = httpPolicy({
  basePath: '/api',
  publicErrors: {
    HUB_NAME_REQUIRED: 'INVALID_REQUEST',
    HUB_NAME_TAKEN: 'CONFLICT',
    HUB_NOT_FOUND: 'NOT_FOUND',
    HUB_RENAME_NAME_REQUIRED: 'INVALID_REQUEST',
    HUB_RENAME_NAME_TAKEN: 'CONFLICT',
    SEQUENCE_NOT_FOUND: 'NOT_FOUND',
    CHECKPOINT_LABEL_REQUIRED: 'INVALID_REQUEST',
    CHECKPOINT_NOT_FOUND: 'NOT_FOUND',
    START_LABEL_FIXED: 'INVALID_REQUEST',
    CHECKPOINT_RENAME_LABEL_REQUIRED: 'INVALID_REQUEST',
    PROGRESS_NOT_SET: 'INVALID_REQUEST',
  },
});
