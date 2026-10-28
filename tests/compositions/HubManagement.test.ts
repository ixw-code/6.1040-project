import { describe, expect, test } from 'bun:test';
import { createApplication } from '@/application.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

describe('HubManagement gateway', () => {
  const mongo = useMongoTestDb();

  test('creates one hub sequence and first checkpoint, then lists and renames them', async () => {
    const { gateway } = createApplication(mongo.db());
    const created = await gateway.invoke('/hubs/create', { name: '  Arcadia  ', label: '  Chapter 1  ' });
    if (!created.ok) throw new Error('Hub creation failed');
    const { hub, sequence } = created.value as { hub: string; sequence: string };
    expect(typeof hub).toBe('string');
    expect(typeof sequence).toBe('string');
    expect(await new HubCataloguingConcept(mongo.db())._hubs()).toContainEqual({ hub, name: 'Arcadia' });
    expect(await new CheckpointingConcept(mongo.db())._sequences({ scope: hub }))
      .toEqual([{ sequence }]);
    const checkpoints = await gateway.invoke('/checkpoints/list', { hub });
    expect(checkpoints).toMatchObject({ ok: true, value: {
      sequence,
      checkpoints: [
        { checkpoint: expect.any(String), label: 'NotStarted', position: 0 },
        { checkpoint: expect.any(String), label: 'Chapter 1', position: 1 },
      ],
    } });
    expect(await gateway.invoke('/hubs/sequences', { hub })).toMatchObject({
      ok: true, value: { sequences: [{ sequence }] },
    });
    expect(await gateway.invoke('/hubs/rename', { hub, name: 'Arcadia II' })).toMatchObject({
      ok: true, value: { hub },
    });
    expect(await new HubCataloguingConcept(mongo.db())._hub({ name: 'Arcadia II' }))
      .toEqual([{ hub }]);
    expect(await gateway.invoke('/hubs/sequences', { hub })).toMatchObject({
      ok: true, value: { sequences: [{ sequence }] },
    });
  });

  test('appends and relabels without changing IDs, order, or inclusive prefixes', async () => {
    const { gateway } = createApplication(mongo.db());
    const created = await gateway.invoke('/hubs/create', { name: 'Arcadia', label: 'A' });
    if (!created.ok) throw new Error('Hub creation failed');
    const { hub, sequence } = created.value as { hub: string; sequence: string };
    const before = await gateway.invoke('/checkpoints/list', { hub });
    if (!before.ok) throw new Error('Checkpoint list failed');
    const firstRows = (before.value as { checkpoints: { checkpoint: string }[] }).checkpoints;
    const start = firstRows[0]!.checkpoint;
    const first = firstRows[1]!.checkpoint;
    const appended = await gateway.invoke('/checkpoints/append', { hub, sequence, label: '  B  ' });
    if (!appended.ok) throw new Error('Checkpoint append failed');
    const second = (appended.value as { checkpoint: string }).checkpoint;
    expect(await gateway.invoke('/checkpoints/relabel', { hub, checkpoint: first, label: '  Beginning ' }))
      .toMatchObject({ ok: true, value: { checkpoint: first } });
    expect(await gateway.invoke('/checkpoints/list', { hub })).toMatchObject({ ok: true, value: {
      sequence,
      checkpoints: [
        { checkpoint: start, label: 'NotStarted', position: 0 },
        { checkpoint: first, label: 'Beginning', position: 1 },
        { checkpoint: second, label: 'B', position: 2 },
      ],
    } });
    expect(await new CheckpointingConcept(mongo.db())._prefix({ scope: hub, sequence, checkpoint: second }))
      .toEqual([{ checkpoint: start }, { checkpoint: first }, { checkpoint: second }]);
  });

  test('rejects invalid input and cross-hub references without changing either hub', async () => {
    const { gateway } = createApplication(mongo.db());
    expect(await gateway.invoke('/hubs/create', { name: 'Invalid', label: '  ' }))
      .toMatchObject({ ok: false });
    expect(await new HubCataloguingConcept(mongo.db())._hub({ name: 'Invalid' })).toEqual([]);
    const north = await gateway.invoke('/hubs/create', { name: 'North', label: 'N1' });
    const south = await gateway.invoke('/hubs/create', { name: 'South', label: 'S1' });
    if (!north.ok || !south.ok) throw new Error('Hub creation failed');
    const n = north.value as { hub: string; sequence: string };
    const s = south.value as { hub: string; sequence: string };
    const listed = await gateway.invoke('/checkpoints/list', { hub: n.hub });
    if (!listed.ok) throw new Error('Checkpoint list failed');
    const northRows = (listed.value as { checkpoints: { checkpoint: string }[] }).checkpoints;
    const start = northRows[0]!.checkpoint;
    const first = northRows[1]!.checkpoint;
    expect(await gateway.invoke('/checkpoints/append', {
      hub: s.hub, sequence: n.sequence, label: 'wrong',
    })).toMatchObject({ ok: false, error: { kind: 'domain', value: 'SEQUENCE_NOT_FOUND' } });
    expect(await gateway.invoke('/checkpoints/relabel', {
      hub: s.hub, checkpoint: first, label: 'wrong',
    })).toMatchObject({ ok: false, error: { kind: 'domain', value: 'CHECKPOINT_NOT_FOUND' } });
    expect(await gateway.invoke('/hubs/sequences', { hub: 'missing' }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'HUB_NOT_FOUND' } });
    expect(await gateway.invoke('/checkpoints/list', { hub: 'missing' }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'SEQUENCE_NOT_FOUND' } });
    expect(await gateway.invoke('/checkpoints/append', { hub: n.hub, sequence: n.sequence, label: ' ' }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'CHECKPOINT_LABEL_REQUIRED' } });
    expect(await gateway.invoke('/checkpoints/relabel', { hub: n.hub, checkpoint: start, label: 'Changed' }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'START_LABEL_FIXED' } });
    expect(await gateway.invoke('/hubs/create', { name: 'North', label: 'N2' }))
      .toMatchObject({ ok: false });
    expect(await gateway.invoke('/hubs/rename', { hub: s.hub, name: 'North' }))
      .toMatchObject({ ok: false });
    expect(await gateway.invoke('/checkpoints/list', { hub: n.hub })).toMatchObject({
      ok: true, value: { checkpoints: [
        { label: 'NotStarted', position: 0 }, { checkpoint: first, label: 'N1', position: 1 },
      ] },
    });
  });
});
