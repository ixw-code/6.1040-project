import { createGateway } from '@mit-sdg/sync-engine/boundary';
import { assemble } from '@mit-sdg/sync-engine/assembly';
import type { Db } from 'mongodb';
import { applicationConceptSet } from './concepts.ts';
import { createMongoConceptInstances } from './concept-instances.ts';
import { composition as Accounts } from '@/compositions/Accounts.ts';

/** The account gateway is local-only; its inputs come from verified boundary state. */
export function createAccounts(db: Db) {
  const application = assemble({
    conceptSet: applicationConceptSet,
    instances: createMongoConceptInstances(db),
    composition: { Accounts },
    redaction: { fields: ['session', 'providerSubject', 'code', 'state', 'verifier', 'nonce'] },
  });
  return { application, gateway: createGateway({ application }) };
}
