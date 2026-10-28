import { describe, expect, test } from 'bun:test';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { createReaderHttpHandler } from '@/http/edge.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';
import { DocumentingConcept } from '@/concepts/Documenting/Documenting.ts';

const origin = 'http://127.0.0.1:5174';

describe('Articles HTTP boundary', () => {
  const mongo = useMongoTestDb();

  test('allows authenticated editing and requires the hub owner for deletion', async () => {
    const db = mongo.db();
    const handle = createReaderHttpHandler(db, { origin, cookieKey: Buffer.alloc(32), providers: {} });
    const registering = new RegisteringConcept(db);
    const author = (await registering.register({ username: 'author', provider: 'GOOGLE', providerSubject: 'a' })).user;
    const other = (await registering.register({ username: 'other', provider: 'GOOGLE', providerSubject: 'b' })).user;
    const sessions = new SessioningConcept(db);
    const authorSession = (await sessions.start({ user: author })).session;
    const otherSession = (await sessions.start({ user: other })).session;
    const { hub } = await new HubCataloguingConcept(db).create({ name: 'Star Harbor', creator: other });
    await new CheckpointingConcept(db).create({ scope: hub, label: 'Main' });
    const post = (path: string, body: object, session?: string, requestOrigin = origin) =>
      handle(new Request(`http://127.0.0.1:3001/api/articles/${path}`, { method: 'POST',
        headers: { 'content-type': 'application/json', origin: requestOrigin,
          ...(session ? { cookie: `__Host-wikiplotter_session=${session}` } : {}) },
        body: JSON.stringify(body) }));
    const body = { hub, title: 'Guide', author: other, required: [],
      blocks: [{ kind: 'TEXT', body: 'Secret', alt: '', required: [] }] };
    expect((await post('create', body))!.status).toBe(401);
    expect((await post('create', body, authorSession, 'http://evil.test'))!.status).toBe(403);
    const created = (await post('create', body, authorSession))!;
    expect(created.status).toBe(200);
    const { document, blocks } = await created.json() as { document: string; blocks: { block: string }[] };
    expect((await new DocumentingConcept(db)._documentForEditing({ scope: hub, document }))[0]?.author).toBe(author);
    expect((await post('editing', { hub, document }, otherSession))!.status).toBe(200);
    const edit = (await post('editing', { hub, document }, authorSession))!;
    expect(edit.status).toBe(200);
    expect(await edit.json()).toMatchObject({ document, required: [], blocks: [{ block: blocks[0]!.block, required: [] }] });
    expect((await post('save', { hub, document, title: 'Updated by another account', required: [], blocks: [
      { block: blocks[0]!.block, kind: 'TEXT', body: 'Updated', alt: '', required: [] },
    ] }, otherSession))!.status)
      .toBe(200);
    expect((await post('tag', { hub, document, item: blocks[0]!.block, required: ['foreign'] }, authorSession))!.status)
      .toBe(400);
    expect((await post('tag', { hub, document, item: blocks[0]!.block, required: [] }, otherSession))!.status)
      .toBe(200);
    expect((await post('untag', { hub, document, item: blocks[0]!.block }, authorSession))!.status)
      .toBe(200);
    expect((await post('tag', { hub, document, item: blocks[0]!.block, required: [] }, authorSession))!.status)
      .toBe(200);
    expect((await post('save', { hub, document, title: 'Revised', required: [], blocks: [
      { block: blocks[0]!.block, kind: 'TEXT', body: 'Revised', alt: '', required: [] },
    ] }, authorSession))!.status).toBe(200);
    expect((await post('delete', { hub, document }, authorSession))!.status).toBe(403);
    expect((await post('delete', { hub, document }, otherSession))!.status).toBe(200);
    expect(await new DocumentingConcept(db)._documents({ scope: hub })).toEqual([]);
  });
});
