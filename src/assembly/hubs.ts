import { assemble } from '@mit-sdg/sync-engine/assembly';
import { createGateway } from '@mit-sdg/sync-engine/boundary';
import type { ClientSession, Db } from 'mongodb';
import { applicationConceptSet } from './concepts.ts';
import { createMongoConceptInstances } from './concept-instances.ts';
import { composition as Hubs } from '@/compositions/Hubs.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';
import { DocumentingConcept } from '@/concepts/Documenting/Documenting.ts';
import { RequirementTaggingConcept } from '@/concepts/RequirementTagging/RequirementTagging.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';

class GatewayRefusal extends Error {
  constructor(readonly result: Awaited<ReturnType<ReturnType<typeof createHubsGateway>['invoke']>>) {
    super('Hub operation refused.');
  }
}

function createHubsGateway(db: Db, session?: ClientSession, clock?: () => Date) {
  const application = assemble({
    conceptSet: applicationConceptSet,
    instances: createMongoConceptInstances(db, session, clock),
    composition: { Hubs },
    redaction: { fields: ['session'] },
  });
  return createGateway({ application });
}

export class HubForbidden extends Error {}
export class ManagedHubNotFound extends Error {}

/** Framework endpoints handle fixed workflows; this coordinator supplies the transaction boundary. */
export function createHubs(db: Db, clock?: () => Date) {
  async function transactionalInvoke(path: string, input: Record<string, unknown>) {
    const session = db.client.startSession();
    try {
      return await session.withTransaction(async () => {
        const result = await createHubsGateway(db, session, clock).invoke(path, input);
        if (!result.ok) throw new GatewayRefusal(result);
        return result;
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } catch (error) {
      if (error instanceof GatewayRefusal) return error.result;
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async function deleteHub(sessionSecret: string, hub: string): Promise<{ hub: string }> {
    const transaction = db.client.startSession();
    try {
      return await transaction.withTransaction(async () => {
        const sessions = new SessioningConcept(db, clock);
        const user = (await sessions.use({ session: sessionSecret })).user;
        const hubs = new HubCataloguingConcept(db, transaction);
        const metadata = (await hubs._get({ hub }))[0];
        if (!metadata) throw new ManagedHubNotFound();
        if (metadata.creator !== user) throw new HubForbidden();

        const documents = new DocumentingConcept(db, transaction);
        const requirements = new RequirementTaggingConcept(db, transaction);
        for (const { document } of await documents._documents({ scope: hub })) {
          const blocks = await documents._blocks({ scope: hub, document });
          for (const item of [document, ...blocks.map(({ block }) => block)]) {
            if ((await requirements._rule({ item })).length) await requirements.untag({ item });
          }
          await documents.delete({ scope: hub, document });
        }
        await new ProgressRecordingConcept(db, transaction).clearScope({ scope: hub });
        const checkpoints = new CheckpointingConcept(db, transaction);
        for (const { sequence } of await checkpoints._sequences({ scope: hub })) {
          await checkpoints.delete({ scope: hub, sequence });
        }
        await hubs.delete({ hub });
        return { hub };
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } finally {
      await transaction.endSession();
    }
  }

  return { gateway: createHubsGateway(db, undefined, clock), transactionalInvoke, deleteHub };
}
