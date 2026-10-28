import { describe, expect, test } from 'bun:test';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { createHubs, HubForbidden } from '@/assembly/hubs.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';
import { DocumentingConcept } from '@/concepts/Documenting/Documenting.ts';
import { RequirementTaggingConcept } from '@/concepts/RequirementTagging/RequirementTagging.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';

describe('Hubs composition', () => {
  const mongo = useMongoTestDb();

  async function identities() {
    const db = mongo.db();
    const registering = new RegisteringConcept(db);
    const owner = (await registering.register({ username: 'owner', provider: 'GOOGLE', providerSubject: 'owner' })).user;
    const other = (await registering.register({ username: 'other', provider: 'GOOGLE', providerSubject: 'other' })).user;
    const sessions = new SessioningConcept(db);
    return { owner, other, ownerSession: (await sessions.start({ user: owner })).session,
      otherSession: (await sessions.start({ user: other })).session };
  }

  test('creates atomically, manages slug and checkpoints only for the creator', async () => {
    const db = mongo.db();
    const ids = await identities();
    const hubs = createHubs(db);
    const created = await hubs.transactionalInvoke('/hubs/create',
      { session: ids.ownerSession, name: 'Star Harbor', label: 'Chapter One' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { hub, sequence } = created.value as { hub: string; sequence: string };
    expect(await new HubCataloguingConcept(db)._get({ hub }))
      .toEqual([{ name: 'Star Harbor', slug: 'star-harbor', creator: ids.owner }]);
    expect(await new CheckpointingConcept(db)._checkpoints({ scope: hub, sequence })).toHaveLength(2);
    expect((await hubs.transactionalInvoke('/hubs/rename',
      { session: ids.otherSession, hub, name: 'Stolen' })).ok).toBe(false);
    expect((await hubs.transactionalInvoke('/checkpoints/append',
      { session: ids.otherSession, hub, sequence, label: 'Stolen' })).ok).toBe(false);
    expect(await hubs.transactionalInvoke('/hubs/slug',
      { session: ids.ownerSession, hub, slug: 'new-harbor' }))
      .toMatchObject({ ok: true, value: { slug: 'new-harbor' } });
    expect(await new HubCataloguingConcept(db)._bySlug({ slug: 'new-harbor' })).toEqual([{ hub }]);
    const appended = await hubs.transactionalInvoke('/checkpoints/append',
      { session: ids.ownerSession, hub, sequence, label: 'Chapter Two' });
    expect(appended.ok).toBe(true);
    expect((await hubs.gateway.invoke('/checkpoints/list', { hub })).ok).toBe(true);
  });

  test('deletes documents, rules, progress and sequence together; leaves assets unscoped', async () => {
    const db = mongo.db();
    const ids = await identities();
    const hubs = createHubs(db);
    const created = await hubs.transactionalInvoke('/hubs/create',
      { session: ids.ownerSession, name: 'Star Harbor', label: 'Chapter One' });
    if (!created.ok) throw new Error('Hub creation failed');
    const { hub, sequence } = created.value as { hub: string; sequence: string };
    const checkpoints = new CheckpointingConcept(db);
    const selected = (await checkpoints._checkpoints({ scope: hub, sequence }))[1]!.checkpoint;
    const documents = new DocumentingConcept(db);
    const { document } = await documents.create({ scope: hub, author: ids.other, title: 'Secret',
      blocks: [{ kind: 'TEXT', body: 'Reveal', alt: '' }] });
    const block = (await documents._blocks({ scope: hub, document }))[0]!.block;
    const requirements = new RequirementTaggingConcept(db);
    await requirements.tag({ item: document, required: [selected] });
    await requirements.tag({ item: block, required: [selected] });
    await new ProgressRecordingConcept(db).record({ scope: hub, reader: ids.other, checkpoint: selected });
    await expect(hubs.deleteHub(ids.otherSession, hub)).rejects.toBeInstanceOf(HubForbidden);
    expect(await documents._documents({ scope: hub })).toEqual([{ document }]);
    expect(await hubs.deleteHub(ids.ownerSession, hub)).toEqual({ hub });
    expect(await new HubCataloguingConcept(db)._get({ hub })).toEqual([]);
    expect(await documents._documents({ scope: hub })).toEqual([]);
    expect(await requirements._rule({ item: document })).toEqual([]);
    expect(await requirements._rule({ item: block })).toEqual([]);
    expect(await checkpoints._sequences({ scope: hub })).toEqual([]);
    expect(await new ProgressRecordingConcept(db)._checkpoint({ scope: hub, reader: ids.other })).toEqual([]);
  });
});
