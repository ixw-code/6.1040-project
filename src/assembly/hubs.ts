import { assemble } from '@mit-sdg/sync-engine/assembly';
import { createGateway } from '@mit-sdg/sync-engine/boundary';
import type { Db } from 'mongodb';
import { applicationConceptSet } from './concepts.ts';
import { createMongoConceptInstances } from './concept-instances.ts';
import { composition as Hubs } from '@/compositions/Hubs.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';
import { DocumentingConcept } from '@/concepts/Documenting/Documenting.ts';
import { RequirementTaggingConcept } from '@/concepts/RequirementTagging/RequirementTagging.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';
import { registerOperationRecovery, runOperation, type PendingOperation } from '@/operations/Coordinator.ts';

function createHubsGateway(db: Db, clock?: () => Date) {
  const application = assemble({
    conceptSet: applicationConceptSet,
    instances: createMongoConceptInstances(db, clock),
    composition: { Hubs },
    redaction: { fields: ['session'] },
  });
  return createGateway({ application });
}

export class HubForbidden extends Error {}
export class ManagedHubNotFound extends Error {}

/** Framework endpoints coordinate ordinary standalone MongoDB operations. */
export function createHubs(db: Db, clock?: () => Date) {
  const gateway = createHubsGateway(db, clock);
  const catalog = new HubCataloguingConcept(db);
  const checkpoints = new CheckpointingConcept(db);

  async function finishLegacyCreate(hub: string, name: string, checkpoint?: string) {
    const { sequence } = await checkpoints.create({ scope: hub, label: name.trim() });
    if (!checkpoint?.trim()) return;
    const ordinary = await checkpoints._checkpoints({ scope: hub, sequence });
    if (!ordinary.some((row) => row.position > 0 && row.label === checkpoint.trim())) {
      await checkpoints.append({ sequence, label: checkpoint });
    }
  }

  async function recoverCreate(actor: string, name: string, legacyCheckpoint?: string) {
    let hub = (await catalog._hub({ name: name.trim() }))[0]?.hub;
    if (!hub) {
      const session = await recoverySession(actor);
      try {
        const result = await gateway.invoke('/hubs/create', { session, name });
        if (result.ok && legacyCheckpoint?.trim()) {
          await finishLegacyCreate((result.value as { hub: string }).hub, name, legacyCheckpoint);
        }
        return result;
      } finally { await new SessioningConcept(db, clock).end({ session }); }
    }
    const owner = (await catalog._get({ hub }))[0];
    if (!owner || owner.creator !== actor) {
      const session = await recoverySession(actor);
      try { return await gateway.invoke('/hubs/create', { session, name }); }
      finally { await new SessioningConcept(db, clock).end({ session }); }
    }
    await finishLegacyCreate(hub, name, legacyCheckpoint);
    const { sequence } = (await checkpoints._sequences({ scope: hub }))[0]!;
    return { ok: true, value: { hub, sequence } } as Awaited<ReturnType<typeof gateway.invoke>>;
  }

  async function recoverySession(actor: string): Promise<string> {
    return (await new SessioningConcept(db, clock).start({ user: actor })).session;
  }

  async function invoke(path: string, input: Record<string, unknown>) {
    if (path !== '/hubs/create') return gateway.invoke(path, input);
    const sessionSecret = input.session;
    if (typeof sessionSecret !== 'string') return gateway.invoke(path, input);
    const actor = (await new SessioningConcept(db, clock).use({ session: sessionSecret })).user;
    const name = input.name as string;
    const trimmedName = name.trim();
    const derivedSlug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!trimmedName || derivedSlug.length < 3 || derivedSlug.length > 80 ||
      (await catalog._hub({ name: trimmedName })).length || (await catalog._bySlug({ slug: derivedSlug })).length) {
      return gateway.invoke(path, input);
    }
    return runOperation({ db, kind: 'hub.create', actor, payload: { name },
      work: async () => {
        const result = await gateway.invoke(path, input);
        if (result.ok) return result;
        const hub = (await catalog._hub({ name: trimmedName }))[0]?.hub;
        const owner = hub && (await catalog._get({ hub }))[0]?.creator;
        if (owner === actor) return recoverCreate(actor, name);
        return result;
      },
    });
  }

  async function deleteHub(sessionSecret: string, hub: string): Promise<{ hub: string }> {
    const user = (await new SessioningConcept(db, clock).use({ session: sessionSecret })).user;
    const metadata = (await catalog._get({ hub }))[0];
    if (!metadata) throw new ManagedHubNotFound();
    if (metadata.creator !== user) throw new HubForbidden();
    return runOperation({ db, kind: 'hub.delete', actor: user, payload: { hub },
      work: () => deleteHubContent(user, hub),
    });
  }

  async function deleteHubContent(user: string, hub: string): Promise<{ hub: string }> {
    const metadata = (await catalog._get({ hub }))[0];
    if (!metadata) return { hub };
    if (metadata.creator !== user) throw new HubForbidden();
    const documents = new DocumentingConcept(db);
    const requirements = new RequirementTaggingConcept(db);
    for (const { document } of await documents._documents({ scope: hub })) {
      const blocks = await documents._blocks({ scope: hub, document });
      for (const item of [document, ...blocks.map(({ block }) => block)]) {
        if ((await requirements._rule({ item })).length) await requirements.untag({ item });
      }
      await documents.delete({ scope: hub, document });
    }
    await new ProgressRecordingConcept(db).clearScope({ scope: hub });
    for (const { sequence } of await checkpoints._sequences({ scope: hub })) {
      await checkpoints.delete({ scope: hub, sequence });
    }
    await catalog.delete({ hub });
    return { hub };
  }

  registerOperationRecovery(db, 'hub.create', async (operation: PendingOperation) => {
    const { name, label } = operation.payload as { name: string; label?: string };
    return recoverCreate(operation.actor, name, label);
  });
  registerOperationRecovery(db, 'hub.delete', (operation) => {
    const { hub } = operation.payload as { hub: string };
    return deleteHubContent(operation.actor, hub);
  });

  return { gateway, invoke, deleteHub };
}
