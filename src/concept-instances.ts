import type { Db } from 'mongodb';
import { HubCataloguingConcept } from './concepts/HubCataloguing.ts';
import { CheckpointingConcept } from './concepts/Checkpointing.ts';
import { DocumentingConcept } from './concepts/Documenting.ts';
import { ProgressRecordingConcept } from './concepts/ProgressRecording.ts';
import { RequirementTaggingConcept } from './concepts/RequirementTagging.ts';

/** Supply these ready instances to sync-engine assemble({ ..., instances }). */
export function createMongoConceptInstances(db: Db) {
  return {
    HubCataloguing: new HubCataloguingConcept(db),
    Checkpointing: new CheckpointingConcept(db),
    Documenting: new DocumentingConcept(db),
    ProgressRecording: new ProgressRecordingConcept(db),
    RequirementTagging: new RequirementTaggingConcept(db),
  };
}
