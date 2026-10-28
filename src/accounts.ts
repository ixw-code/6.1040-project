import { createGateway } from '@mit-sdg/sync-engine/boundary';
import { assemble } from '@mit-sdg/sync-engine/assembly';
import type { Db } from 'mongodb';
import { accountConceptSet } from '@/account-concepts.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { composition as Accounts } from '@/compositions/Accounts.ts';

/** The account gateway is local-only; its inputs come from verified boundary state. */
export function createAccounts(db: Db) {
  const application = assemble({
    conceptSet: accountConceptSet,
    instances: {
      Registering: new RegisteringConcept(db),
      Sessioning: new SessioningConcept(db),
    },
    composition: { Accounts },
    redaction: { fields: ['session', 'providerSubject', 'code', 'state', 'verifier', 'nonce'] },
  });
  return { application, gateway: createGateway({ application }) };
}
