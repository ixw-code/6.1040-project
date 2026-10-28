import { describe, expect, test } from 'bun:test';
import { createGateway } from '@mit-sdg/sync-engine/boundary';
import { createApplication } from '@/application.ts';
import { assembleWikiplotter } from '@/assembly.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

describe('ReaderProgress local gateway', () => {
  const mongo = useMongoTestDb();

  async function createHub(gateway: ReturnType<typeof createApplication>['gateway'], name: string) {
    const created = await gateway.invoke('/hubs/create', { name, label: 'First' });
    if (!created.ok) throw new Error('Hub creation failed');
    const { hub, sequence } = created.value as { hub: string; sequence: string };
    const listed = await gateway.invoke('/checkpoints/list', { hub });
    if (!listed.ok) throw new Error('Checkpoint listing failed');
    const rows = (listed.value as { checkpoints: { checkpoint: string }[] }).checkpoints;
    return { hub, sequence, start: rows[0]!.checkpoint, first: rows[1]!.checkpoint };
  }

  test('returns missing progress, records NotStarted, moves backward, and clears idempotently', async () => {
    const { gateway } = createApplication(mongo.db());
    const { hub, sequence, start, first } = await createHub(gateway, 'North');
    const second = await gateway.invoke('/checkpoints/append', { hub, sequence, label: 'Second' });
    if (!second.ok) throw new Error('Checkpoint append failed');
    const later = (second.value as { checkpoint: string }).checkpoint;

    expect(await gateway.invoke('/progress/get', { hub, reader: 'alice' }))
      .toMatchObject({ ok: true, value: { checkpoint: null } });
    for (const checkpoint of [start, later, first, start]) {
      expect(await gateway.invoke('/progress/record', { hub, reader: 'alice', checkpoint }))
        .toMatchObject({ ok: true, value: { checkpoint } });
      expect(await gateway.invoke('/progress/get', { hub, reader: 'alice' }))
        .toMatchObject({ ok: true, value: { checkpoint } });
    }
    expect(await gateway.invoke('/progress/clear', { hub, reader: 'alice' }))
      .toMatchObject({ ok: true, value: { cleared: true } });
    expect(await gateway.invoke('/progress/get', { hub, reader: 'alice' }))
      .toMatchObject({ ok: true, value: { checkpoint: null } });
    expect(await gateway.invoke('/progress/clear', { hub, reader: 'alice' }))
      .toMatchObject({ ok: true, value: { cleared: false } });
  });

  test('isolates readers and hubs, and rejects unknown and foreign selections', async () => {
    const { gateway } = createApplication(mongo.db());
    const north = await createHub(gateway, 'North');
    const south = await createHub(gateway, 'South');
    const record = (hub: string, reader: string, checkpoint: string) =>
      gateway.invoke('/progress/record', { hub, reader, checkpoint });
    expect(await record(north.hub, 'alice', north.first)).toMatchObject({ ok: true });
    expect(await record(north.hub, 'bob', north.start)).toMatchObject({ ok: true });
    expect(await record(south.hub, 'alice', south.first)).toMatchObject({ ok: true });

    expect(await record(north.hub, 'alice', south.first))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'CHECKPOINT_NOT_FOUND' } });
    expect(await record(north.hub, 'alice', 'missing'))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'CHECKPOINT_NOT_FOUND' } });
    expect(await record('missing', 'alice', north.first))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'HUB_NOT_FOUND' } });
    expect(await record('North', 'alice', north.first))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'HUB_NOT_FOUND' } });
    expect(await gateway.invoke('/progress/get', { hub: 'missing', reader: 'alice' }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'HUB_NOT_FOUND' } });
    expect(await gateway.invoke('/progress/clear', { hub: 'missing', reader: 'alice' }))
      .toMatchObject({ ok: false, error: { kind: 'domain', value: 'HUB_NOT_FOUND' } });
    expect(await gateway.invoke('/progress/get', { hub: north.hub, reader: 'alice' }))
      .toMatchObject({ ok: true, value: { checkpoint: north.first } });
    expect(await gateway.invoke('/progress/get', { hub: north.hub, reader: 'bob' }))
      .toMatchObject({ ok: true, value: { checkpoint: north.start } });
    expect(await gateway.invoke('/progress/get', { hub: south.hub, reader: 'alice' }))
      .toMatchObject({ ok: true, value: { checkpoint: south.first } });
    expect(await gateway.invoke('/progress/clear', { hub: north.hub, reader: 'alice' }))
      .toMatchObject({ ok: true, value: { cleared: true } });
    expect(await new ProgressRecordingConcept(mongo.db())._checkpoint({ scope: south.hub, reader: 'alice' }))
      .toEqual([{ checkpoint: south.first }]);
  });

  test('validates reader input through the reader gateway', async () => {
    const readerGateway = createGateway({ application: assembleWikiplotter(mongo.db()) });
    const { hub } = await createHub(createApplication(mongo.db()).gateway, 'North');
    expect(Object.keys(assembleWikiplotter(mongo.db()).publicInterface.routes))
      .toEqual(expect.arrayContaining(['/progress/get', '/progress/record', '/progress/clear']));
    expect(await readerGateway.invoke('/progress/get', { hub, reader: ' ' }))
      .toMatchObject({ ok: false, error: { kind: 'framework', code: 'INVALID_INPUT' } });
    expect(await readerGateway.invoke('/progress/record', { hub, reader: 'alice', checkpoint: 7 }))
      .toMatchObject({ ok: false, error: { kind: 'framework', code: 'INVALID_INPUT' } });
    expect(await readerGateway.invoke('/progress/get', { hub, reader: null }))
      .toMatchObject({ ok: false, error: { kind: 'framework', code: 'INVALID_INPUT' } });
  });
});
