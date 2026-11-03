import { createGateway } from '@mit-sdg/sync-engine/boundary';
import { assemble } from '@mit-sdg/sync-engine/assembly';
import type { Db } from 'mongodb';
import { applicationConceptSet } from './concepts.ts';
import { createMongoConceptInstances } from './concept-instances.ts';
import { composition as Accounts } from '@/compositions/Accounts.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { MediaAssetManagingConcept } from '@/concepts/MediaAssetManaging/MediaAssetManaging.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept, SessionInvalid } from '@/concepts/Sessioning/Sessioning.ts';
import { GridFsMedia } from '@/storage/GridFsMedia.ts';
import { registerOperationRecovery, runOperation, withApplicationLock, type PendingOperation } from
  '@/operations/Coordinator.ts';

export class AccountOwnsHubs extends Error {}

/** The account gateway is local-only; its inputs come from verified boundary state. */
export function createAccounts(db: Db) {
  const application = assemble({
    conceptSet: applicationConceptSet,
    instances: createMongoConceptInstances(db),
    composition: { Accounts },
    redaction: { fields: ['session', 'providerSubject', 'code', 'state', 'verifier', 'nonce'] },
  });
  const gateway = createGateway({ application });
  const cataloguing = new HubCataloguingConcept(db);
  const media = new MediaAssetManagingConcept(db);
  const progress = new ProgressRecordingConcept(db);
  const registering = new RegisteringConcept(db);
  const sessioning = new SessioningConcept(db);
  const storage = new GridFsMedia(db);

  async function removeUserData(user: string): Promise<{ deleted: true }> {
    await sessioning.endUser({ user });
    if ((await registering._user({ user })).length) await registering.unregister({ user });

    for (const { scope } of await progress._scopesForReader({ reader: user })) {
      await progress.clear({ scope, reader: user });
    }

    for (const { asset } of await media._uploadedBy({ uploader: user })) {
      const row = (await media._get({ asset }))[0];
      if (!row) continue;
      await storage.delete(row.storageKey);
      await media.delete({ asset });
    }
    return { deleted: true };
  }

  registerOperationRecovery(db, 'account.delete', (operation: PendingOperation) =>
    removeUserData(operation.actor));

  async function deleteAccount(session: string): Promise<{ deleted: true } | { error: string }> {
    return withApplicationLock(db, async () => {
      const { user } = await sessioning.use({ session });
      if (!(await registering._user({ user })).length) throw new SessionInvalid();
      if ((await cataloguing._createdBy({ creator: user })).length) throw new AccountOwnsHubs();

      return runOperation({
        db,
        kind: 'account.delete',
        actor: user,
        payload: {},
        work: async () => {
          const result = await gateway.invoke('/accounts/delete', { session });
          if (!result.ok) {
            // Session validation is the first composition step. If it failed,
            // no account state changed and the request must not trigger cleanup.
            if ((await registering._user({ user })).length) {
              const failure = result.error;
              const code = failure && typeof failure === 'object' && 'value' in failure &&
                typeof failure.value === 'string' ? failure.value : 'ACCOUNT_DELETE_FAILED';
              return { error: code };
            }
            return removeUserData(user);
          }

          const value = result.value as { deleted?: boolean; error?: string };
          if (value.error) return { error: value.error };
          if (value.deleted !== true) throw new Error('Account deletion did not complete.');
          return removeUserData(user);
        },
      });
    });
  }

  return { application, gateway, deleteAccount };
}
