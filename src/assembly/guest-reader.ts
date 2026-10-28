import { assemble } from '@mit-sdg/sync-engine/assembly';
import { createGateway } from '@mit-sdg/sync-engine/boundary';
import type { ClientSession, Db } from 'mongodb';
import { applicationConceptSet } from './concepts.ts';
import { createMongoConceptInstances } from './concept-instances.ts';
import { guestComposition as ReaderProgress } from '@/compositions/ReaderProgress.ts';
import { guestComposition as Reading } from '@/compositions/Reading.ts';

/** Cookie-derived selections reach these local endpoints only after HTTP verification. */
export function createGuestReader(db: Db, session?: ClientSession) {
  const application = assemble({
    conceptSet: applicationConceptSet,
    instances: createMongoConceptInstances(db, session),
    composition: { ReaderProgress, Reading },
  });
  return createGateway({ application });
}
