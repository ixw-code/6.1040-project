import type { ClientSession, Db } from 'mongodb';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';
import { DocumentingConcept } from '@/concepts/Documenting/Documenting.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';
import { RequirementTaggingConcept } from '@/concepts/RequirementTagging/RequirementTagging.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { MediaAssetManagingConcept } from '@/concepts/MediaAssetManaging/MediaAssetManaging.ts';

/** Supply these ready instances to sync-engine assemble({ ..., instances }). */
export function createMongoConceptInstances(db: Db, session?: ClientSession, clock?: () => Date) {
  return {
    HubCataloguing: new HubCataloguingConcept(db, session),
    Checkpointing: new CheckpointingConcept(db, session),
    Documenting: new DocumentingConcept(db, session),
    ProgressRecording: new ProgressRecordingConcept(db, session),
    RequirementTagging: new RequirementTaggingConcept(db, session),
    Registering: new RegisteringConcept(db),
    Sessioning: new SessioningConcept(db, clock),
    MediaAssetManaging: new MediaAssetManagingConcept(db, session),
  };
}
