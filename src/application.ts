import { createGateway } from '@mit-sdg/sync-engine/boundary';
import type { Db } from 'mongodb';
import { assembleWikiplotter } from './assembly.ts';

export function createApplication(db: Db) {
  const application = assembleWikiplotter(db);
  const gateway = createGateway({ application });
  return { application, gateway };
}
