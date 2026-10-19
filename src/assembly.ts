import { assemble } from '@mit-sdg/sync-engine/assembly';
import { MongoClient, type Db } from 'mongodb';
import { composition as hubManagement } from '@/compositions/HubManagement.ts';
import { composition as contentManagement } from '@/compositions/ContentManagement.ts';
import { applicationConceptSet } from '@/concepts.ts';
import { createMongoConceptInstances } from '@/concept-instances.ts';

/** The no-argument form supports runtime and design tooling without opening a connection. */
function assembleWith(db: Db | undefined, setup: boolean) {
  const handle = db ?? new MongoClient('mongodb://127.0.0.1:27017/wikiplotter_alpha_tooling').db();
  return assemble({
    conceptSet: applicationConceptSet,
    instances: createMongoConceptInstances(handle),
    composition: setup
      ? { HubManagement: hubManagement, ContentManagement: contentManagement }
      : { HubManagement: hubManagement },
  });
}

export function assembleWikiplotter(db?: Db) {
  return assembleWith(db, false);
}

/** Local setup gateway only; never pass this assembly to the HTTP host. */
export function assembleSetupWikiplotter(db?: Db) {
  return assembleWith(db, true);
}
