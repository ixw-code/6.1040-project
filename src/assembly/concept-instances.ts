import type { Db } from 'mongodb';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';
import { DocumentingConcept } from '@/concepts/Documenting/Documenting.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';
import { RequirementTaggingConcept } from '@/concepts/RequirementTagging/RequirementTagging.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';

/** Supply these ready instances to sync-engine assemble({ ..., instances }). */
export function createMongoConceptInstances(db: Db) {
  return {
    HubCataloguing: new HubCataloguingConcept(db),
    Checkpointing: new CheckpointingConcept(db),
    Documenting: new DocumentingConcept(db),
    ProgressRecording: new ProgressRecordingConcept(db),
    RequirementTagging: new RequirementTaggingConcept(db),
    Registering: new RegisteringConcept(db),
    Sessioning: new SessioningConcept(db),
  };
}
