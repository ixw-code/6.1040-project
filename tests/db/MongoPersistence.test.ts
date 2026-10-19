import { describe, expect, test } from 'bun:test';
import { HubCataloguingConcept, HubNameTaken } from '@/concepts/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing.ts';
import { DocumentingConcept, DocumentNameTaken } from '@/concepts/Documenting.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording.ts';
import { RequirementTaggingConcept } from '@/concepts/RequirementTagging.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

describe('MongoDB persistence and concurrent invariants', () => {
  const mongo = useMongoTestDb();

  test('all five concepts survive reconstruction and MongoClient reconnection', async () => {
    let db = mongo.db();
    const hubs = new HubCataloguingConcept(db);
    const checkpoints = new CheckpointingConcept(db);
    const documents = new DocumentingConcept(db);
    const progress = new ProgressRecordingConcept(db);
    const requirements = new RequirementTaggingConcept(db);

    const { hub } = await hubs.create({ name: 'Chronicles' });
    const { sequence } = await checkpoints.create({ scope: hub, label: 'Main' });
    const { checkpoint: first } = await checkpoints.append({ sequence, label: 'Part I' });
    const { checkpoint: second } = await checkpoints.append({ sequence, label: 'Part II' });
    const { document } = await documents.create({
      scope: hub,
      title: 'Chronicles',
      blocks: [
        { kind: 'IMAGE', body: '/scene.png', alt: 'Scene' },
        { kind: 'TEXT', body: 'Secret twist', alt: '' },
      ],
    });
    const block = (await documents._blocks({ scope: hub, document }))[0]!.block;
    await progress.record({ scope: hub, reader: 'reader1', checkpoint: second });
    await requirements.tag({ item: document, required: [] });
    await requirements.tag({ item: block, required: [second] });

    // Simulates process shutdown and reinitialization without stopping the actual mongod.
    db = await mongo.reconnect();
    const hubsAfter = new HubCataloguingConcept(db);
    const checkpointsAfter = new CheckpointingConcept(db);
    const documentsAfter = new DocumentingConcept(db);
    const progressAfter = new ProgressRecordingConcept(db);
    const requirementsAfter = new RequirementTaggingConcept(db);

    expect(await hubsAfter._hub({ name: 'Chronicles' })).toEqual([{ hub }]);
    expect(await checkpointsAfter.create({ scope: hub, label: 'Main' })).toEqual({ sequence });
    expect(await checkpointsAfter._prefix({ scope: hub, sequence, checkpoint: second }))
      .toEqual([
        { checkpoint: (await checkpointsAfter._checkpoints({ scope: hub, sequence }))[0]!.checkpoint },
        { checkpoint: first }, { checkpoint: second },
      ]);
    expect(await documentsAfter._blocks({ scope: hub, document })).toEqual([
      { block, kind: 'IMAGE', body: '/scene.png', alt: 'Scene' },
      expect.objectContaining({ kind: 'TEXT', body: 'Secret twist', alt: '' }),
    ]);
    expect(await documentsAfter._title({ scope: hub, document })).toEqual([{ title: 'Chronicles' }]);
    expect(await progressAfter._checkpoint({ scope: hub, reader: 'reader1' }))
      .toEqual([{ checkpoint: second }]);
    expect(await requirementsAfter._rule({ item: document })).toEqual([{ required: [] }]);
    expect(await requirementsAfter._eligible({ item: block, tokens: [first] }))
      .toEqual({ eligible: false });
    expect(await requirementsAfter._eligible({ item: block, tokens: [first, second] }))
      .toEqual({ eligible: true });
  });

  test('a unique index rejects concurrent hub creations with the same name', async () => {
    const hubs = new HubCataloguingConcept(mongo.db());
    const attempts = await Promise.allSettled([
      hubs.create({ name: 'Same' }),
      hubs.create({ name: ' Same ' }),
    ]);
    expect(attempts.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failures = attempts.filter((r) => r.status === 'rejected');
    expect(failures).toHaveLength(1);
    expect(failures[0]?.reason).toBeInstanceOf(HubNameTaken);
    expect(await hubs._hubs()).toHaveLength(1);
  });

  test('a unique index rejects concurrent document titles within a scope', async () => {
    const documents = new DocumentingConcept(mongo.db());
    const attempts = await Promise.allSettled([
      documents.create({ scope: 'hub', title: 'Map', blocks: [] }),
      documents.create({ scope: 'hub', title: ' Map ', blocks: [] }),
    ]);
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const failures = attempts.filter((result) => result.status === 'rejected');
    expect(failures).toHaveLength(1);
    expect(failures[0]?.reason).toBeInstanceOf(DocumentNameTaken);
  });

  test('existing sequences gain a stable NotStarted identity without rewriting stored checkpoints', async () => {
    await mongo.db().collection<{
      _id: string;
      scope: string;
      checkpoints: { checkpoint: string; label: string }[];
    }>('sequences').insertOne({
      _id: 'existing-sequence', scope: 'hub',
      checkpoints: [{ checkpoint: 'chapter-1', label: 'Chapter 1' }],
    });
    const checkpoints = new CheckpointingConcept(mongo.db());
    const rows = await checkpoints._checkpoints({ scope: 'hub', sequence: 'existing-sequence' });
    expect(rows).toEqual([
      { checkpoint: 'start:existing-sequence', label: 'NotStarted', position: 0 },
      { checkpoint: 'chapter-1', label: 'Chapter 1', position: 1 },
    ]);
    expect(await checkpoints._checkpoints({ scope: 'hub', sequence: 'existing-sequence' }))
      .toEqual(rows);
    expect(await checkpoints._prefix({ scope: 'hub', sequence: 'existing-sequence', checkpoint: 'chapter-1' }))
      .toEqual([{ checkpoint: 'start:existing-sequence' }, { checkpoint: 'chapter-1' }]);
  });

  test('concurrent progress writes still store one checkpoint per reader and hub', async () => {
    const progress = new ProgressRecordingConcept(mongo.db());
    await Promise.all([
      progress.record({ scope: 'hub', reader: 'reader', checkpoint: 'A' }),
      progress.record({ scope: 'hub', reader: 'reader', checkpoint: 'B' }),
    ]);
    const rows = await mongo.db().collection('progress').find({ scope: 'hub', reader: 'reader' }).toArray();
    expect(rows).toHaveLength(1);
    expect(['A', 'B']).toContain(rows[0]!.checkpoint);
  });

  test('concurrent sequence creation remains idempotent and appends are not lost', async () => {
    const checkpoints = new CheckpointingConcept(mongo.db());
    const created = await Promise.all(
      Array.from({ length: 5 }, () => checkpoints.create({ scope: 'hub-1', label: 'Main' })),
    );
    const sequence = created[0]!.sequence;
    expect(created.every((c) => c.sequence === sequence)).toBe(true);
    const labels = ['A', 'B', 'C', 'D'];
    const inserted = await Promise.all(labels.map((label) => checkpoints.append({ sequence, label })));
    const rows = await checkpoints._checkpoints({ scope: 'hub-1', sequence });
    expect(rows).toHaveLength(labels.length + 1);
    expect(rows[0]).toEqual({ checkpoint: expect.any(String), label: 'NotStarted', position: 0 });
    expect(new Set(rows.slice(1).map((r) => r.checkpoint)))
      .toEqual(new Set(inserted.map((r) => r.checkpoint)));
    expect(rows.map((r) => r.position)).toEqual([0, 1, 2, 3, 4]);
  });
});
