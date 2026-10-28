import { assemble } from '@mit-sdg/sync-engine/assembly';
import { MongoClient, type ClientSession, type Db } from 'mongodb';
import { composition as readerProgress } from '@/compositions/ReaderProgress.ts';
import { composition as reading } from '@/compositions/Reading.ts';
import { applicationConceptSet } from './concepts.ts';
import { createMongoConceptInstances } from './concept-instances.ts';

/** The no-argument form supports runtime and design tooling without opening a connection. */
function assembleWith(db: Db | undefined, session?: ClientSession) {
  const mongoUrl = process.env.MONGODB_URL;
  if (!db && !mongoUrl) throw new Error('MONGODB_URL must be set for the default assembly.');
  const handle = db ?? new MongoClient(mongoUrl!).db();
  return assemble({
    conceptSet: applicationConceptSet,
    instances: createMongoConceptInstances(handle, session),
    composition: { ReaderProgress: readerProgress, Reading: reading },
  });
}

export function assembleWikiplotter(db?: Db, session?: ClientSession) {
  return assembleWith(db, session);
}
