import { conceptSet } from '@mit-sdg/sync-engine/assembly';
import { registration as HubCataloguing } from '@/concepts/HubCataloguing/registry.ts';
import { registration as Checkpointing } from '@/concepts/Checkpointing/registry.ts';
import { registration as Documenting } from '@/concepts/Documenting/registry.ts';
import { registration as ProgressRecording } from '@/concepts/ProgressRecording/registry.ts';
import { registration as RequirementTagging } from '@/concepts/RequirementTagging/registry.ts';

export const applicationConceptSet = conceptSet({
  HubCataloguing, Checkpointing, Documenting, ProgressRecording, RequirementTagging,
});
export const { concepts } = applicationConceptSet;
