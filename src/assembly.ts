import { assemble } from '@mit-sdg/sync-engine/assembly';
import { MongoClient, type Db } from 'mongodb';
import { composition as hubManagement } from '@/compositions/HubManagement.ts';
import { applicationConceptSet } from './concepts.ts';
import { createMongoConceptInstances } from './concept-instances.ts';

/** The no-argument form supports design tooling without opening a connection. */
export function assembleWikiplotter(db?: Db) {
  const handle = db ?? new MongoClient('mongodb://127.0.0.1:27017/wikiplotter_alpha_tooling').db();
  return assemble({
    conceptSet: applicationConceptSet,
    instances: createMongoConceptInstances(handle),
    composition: { HubManagement: hubManagement },
  });
}
