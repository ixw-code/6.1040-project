import { conceptSet } from '@mit-sdg/sync-engine/assembly';
import { registration as HubCataloguing } from '@/concepts/HubCataloguing/registry.ts';
import { registration as Checkpointing } from '@/concepts/Checkpointing/registry.ts';
import { registration as Documenting } from '@/concepts/Documenting/registry.ts';
import { registration as ProgressRecording } from '@/concepts/ProgressRecording/registry.ts';
import { registration as RequirementTagging } from '@/concepts/RequirementTagging/registry.ts';
import { registration as Registering } from '@/concepts/Registering/registry.ts';
import { registration as Sessioning } from '@/concepts/Sessioning/registry.ts';
import { registration as MediaAssetManaging } from '@/concepts/MediaAssetManaging/registry.ts';

export const applicationConceptSet = conceptSet({
  HubCataloguing, Checkpointing, Documenting, ProgressRecording, RequirementTagging, Registering, Sessioning,
  MediaAssetManaging,
});
export const { concepts } = applicationConceptSet;
