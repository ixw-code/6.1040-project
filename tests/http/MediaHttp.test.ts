import { describe, expect, test } from 'bun:test';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { createReaderHttpHandler } from '@/http/edge.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';
import { createArticles } from '@/compositions/Articles.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';

const origin = 'http://127.0.0.1:5174';
const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
describe('Media HTTP', () => {
  const mongo = useMongoTestDb();
  test('protects upload and preview while reader bytes follow spoiler eligibility', async () => {
    const db = mongo.db();
    const handler = createReaderHttpHandler(db, { origin, cookieKey: Buffer.alloc(32), providers: {} });
    const reg = new RegisteringConcept(db);
    const author = (await reg.register({ username: 'author', provider: 'GOOGLE', providerSubject: 'a' })).user;
    const reader = (await reg.register({ username: 'reader', provider: 'GOOGLE', providerSubject: 'b' })).user;
    const sessions = new SessioningConcept(db);
    const authorToken = (await sessions.start({ user: author })).session;
    const readerToken = (await sessions.start({ user: reader })).session;
    const post = (route: string, body: object, token?: string, requestOrigin = origin) => handler(new Request(
      `http://127.0.0.1:3001/api/assets/${route}`, { method: 'POST', headers: {
        'content-type': 'application/json', origin: requestOrigin,
        ...(token ? { cookie: `__Host-wikiplotter_session=${token}` } : {}),
      }, body: JSON.stringify(body) }));
    const upload = { filename: 'map.png', kind: 'IMAGE', contentType: 'image/png', data: png.toString('base64') };
    expect((await post('start', upload))!.status).toBe(401);
    expect((await post('start', upload, authorToken, 'http://bad.test'))!.status).toBe(403);
    const started = (await post('start', upload, authorToken))!;
    expect(started.status).toBe(200);
    const { asset } = await started.json() as { asset: string };
    expect((await post('preview', { asset }, authorToken))!.status).toBe(400);
    expect((await post('preview', { asset }, readerToken))!.status).toBe(403);
    expect((await post('finish', { asset }, authorToken))!.status).toBe(200);
    const preview = (await post('preview', { asset }, authorToken))!;
    expect(preview.status).toBe(200);
    expect(Buffer.from(await preview.arrayBuffer())).toEqual(png);
    expect((await post('get', { asset }, readerToken))!.status).toBe(403);
    const { hub } = await new HubCataloguingConcept(db).create({ name: 'Media Hub', creator: author });
    const checkpoints = new CheckpointingConcept(db);
    const { sequence } = await checkpoints.create({ scope: hub, label: 'Main' });
    const start = (await checkpoints._checkpoints({ scope: hub, sequence }))[0]!.checkpoint;
    const { checkpoint: later } = await checkpoints.append({ sequence, label: 'Later' });
    const created = await createArticles(db).CreateArticle(authorToken, { hub, title: 'Maps', required: [],
      blocks: [{ kind: 'IMAGE', body: asset, alt: 'Map', required: [later] }], });
    const block = created.blocks[0]!.block;
    await new ProgressRecordingConcept(db).record({ scope: hub, reader, checkpoint: start });
    expect((await post('read', { hub, document: created.document, block, asset }, readerToken))!.status).toBe(404);
    await new ProgressRecordingConcept(db).record({ scope: hub, reader, checkpoint: later });
    const read = (await post('read', { hub, document: created.document, block, asset }, readerToken))!;
    expect(read.status).toBe(200);
    expect(Buffer.from(await read.arrayBuffer())).toEqual(png);
    expect((await post('delete', { asset }, authorToken))!.status).toBe(409);
  });
});
