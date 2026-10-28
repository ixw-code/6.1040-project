import { createGateway } from '@mit-sdg/sync-engine/boundary';
import type { Db } from 'mongodb';
import { assembleSetupWikiplotter } from './assembly.ts';

export function createApplication(db: Db) {
  const application = assembleSetupWikiplotter(db);
  const gateway = createGateway({ application });
  return { application, gateway };
}
