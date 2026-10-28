import { describe, expect, test } from 'bun:test';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';
import { createArticles, ArticleError } from '@/compositions/Articles.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';
import { DocumentingConcept } from '@/concepts/Documenting/Documenting.ts';
import { RequirementTaggingConcept } from '@/concepts/RequirementTagging/RequirementTagging.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';
import { createApplication } from '@tests/fixture-application.ts';

describe('Articles composition', () => {
  const mongo = useMongoTestDb();

  async function setup() {
    const db = mongo.db();
    const registering = new RegisteringConcept(db);
    const author = (await registering.register({ username: 'author', provider: 'GOOGLE', providerSubject: 'a' })).user;
    const other = (await registering.register({ username: 'other', provider: 'GOOGLE', providerSubject: 'b' })).user;
    const sessions = new SessioningConcept(db);
    const authorSession = (await sessions.start({ user: author })).session;
    const otherSession = (await sessions.start({ user: other })).session;
    const { hub } = await new HubCataloguingConcept(db).create({ name: 'Star Harbor', creator: other });
    const checkpoints = new CheckpointingConcept(db);
    const { sequence } = await checkpoints.create({ scope: hub, label: 'Main' });
    const start = (await checkpoints._checkpoints({ scope: hub, sequence }))[0]!.checkpoint;
    const { checkpoint: first } = await checkpoints.append({ sequence, label: 'Chapter One' });
    return { db, author, other, authorSession, otherSession, hub, start, first };
  }

  test('creates explicit rules and saves stable surviving blocks atomically', async () => {
    const s = await setup();
    const articles = createArticles(s.db);
    const created = await articles.CreateArticle(s.authorSession, { hub: s.hub, title: '  Guide  ', required: [],
      blocks: [
        { kind: 'TEXT', body: 'Open', alt: '', required: [] },
        { kind: 'TEXT', body: 'Secret', alt: '', required: [s.first] },
      ] });
    const [open, secret] = created.blocks;
    expect(await new DocumentingConcept(s.db)._documentForEditing({ scope: s.hub, document: created.document }))
      .toMatchObject([{ title: 'Guide', author: s.author }]);
    expect(await articles.EditingView(s.authorSession, s.hub, created.document)).toMatchObject({
      required: [], blocks: [{ block: open!.block, required: [] }, { block: secret!.block, required: [s.first] }],
    });
    expect(await articles.EditingView(s.authorSession, s.hub, 'Guide')).toMatchObject({
      document: created.document, title: 'Guide',
      blocks: [{ block: open!.block, required: [] }, { block: secret!.block, required: [s.first] }],
    });
    expect(await articles.EditingView(s.otherSession, s.hub, created.document)).toMatchObject({
      document: created.document, title: 'Guide', author: s.author,
    });
    await new ProgressRecordingConcept(s.db).record({ scope: s.hub, reader: s.other, checkpoint: s.start });
    const reading = createApplication(s.db).gateway;
    expect(await reading.invoke('/articles/read',
      { hub: s.hub, reader: s.other, document: created.document }))
      .toMatchObject({ ok: true, value: { content: { blocks: [{ block: open!.block }] } } });

    await expect(articles.SaveArticle(s.authorSession, { hub: s.hub, document: created.document,
      title: 'Unsafe', required: [], blocks: [{ block: secret!.block, kind: 'TEXT', body: 'Leaked', alt: '',
        required: ['foreign'] }] })).rejects.toMatchObject({ code: 'INVALID_REQUIREMENTS' });
    expect((await articles.EditingView(s.authorSession, s.hub, created.document)).title).toBe('Guide');

    await articles.CreateArticle(s.authorSession, { hub: s.hub, title: 'Collision', required: [], blocks: [] });
    await expect(articles.SaveArticle(s.authorSession, { hub: s.hub, document: created.document,
      title: 'Collision', required: [], blocks: [
        { block: secret!.block, kind: 'TEXT', body: 'Leaked', alt: '', required: [] },
      ] })).rejects.toThrow();
    expect(await articles.EditingView(s.authorSession, s.hub, created.document)).toMatchObject({
      title: 'Guide', blocks: [{ block: open!.block, body: 'Open', required: [] },
        { block: secret!.block, body: 'Secret', required: [s.first] }],
    });
    const afterFailedSave = await reading.invoke('/articles/read',
      { hub: s.hub, reader: s.other, document: created.document });
    expect(JSON.stringify(afterFailedSave)).not.toContain('Leaked');

    const saved = await articles.SaveArticle(s.authorSession, { hub: s.hub, document: created.document,
      title: 'Revised Guide', required: [], blocks: [
        { block: secret!.block, kind: 'TEXT', body: 'Revised secret', alt: '', required: [s.first] },
        { kind: 'TEXT', body: 'New open', alt: '', required: [] },
      ] });
    expect(saved.blocks[0]!.block).toBe(secret!.block);
    expect(saved.blocks[1]!.block).not.toBe(open!.block);
    expect(await new RequirementTaggingConcept(s.db)._rule({ item: open!.block })).toEqual([]);
    expect(await articles.EditingView(s.authorSession, s.hub, created.document)).toMatchObject({
      title: 'Revised Guide', blocks: [{ block: secret!.block, required: [s.first] }, { required: [] }],
    });
  });

  test('allows authenticated editing and limits deletion to the hub creator', async () => {
    const s = await setup();
    const articles = createArticles(s.db);
    const created = await articles.CreateArticle(s.authorSession, { hub: s.hub, title: 'Guide', required: [],
      blocks: [{ kind: 'TEXT', body: 'Open', alt: '', required: [] }] });
    const block = created.blocks[0]!.block;
    await articles.TagItem(s.otherSession, s.hub, created.document, block, [s.first]);
    expect(await new RequirementTaggingConcept(s.db)._rule({ item: block })).toEqual([{ required: [s.first] }]);
    await expect(articles.TagItem(s.authorSession, s.hub, created.document, 'foreign', []))
      .rejects.toMatchObject({ code: 'ITEM_NOT_FOUND' });
    await articles.TagItem(s.authorSession, s.hub, created.document, block, []);
    await articles.TagItem(s.otherSession, s.hub, created.document, block, [s.first]);
    expect(await new RequirementTaggingConcept(s.db)._rule({ item: block })).toEqual([{ required: [s.first] }]);
    await articles.UntagItem(s.authorSession, s.hub, created.document, block);
    expect(await new RequirementTaggingConcept(s.db)._rule({ item: block })).toEqual([]);
    await expect(articles.DeleteArticle(s.authorSession, s.hub, created.document))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    await articles.DeleteArticle(s.otherSession, s.hub, created.document);
    expect(await new DocumentingConcept(s.db)._documents({ scope: s.hub })).toEqual([]);
    expect(await new RequirementTaggingConcept(s.db)._rule({ item: created.document })).toEqual([]);
    expect(await new RequirementTaggingConcept(s.db)._rule({ item: block })).toEqual([]);
  });

  test('rejects media references until a READY asset can be verified', async () => {
    const s = await setup();
    const articles = createArticles(s.db);
    await expect(articles.CreateArticle(s.authorSession, { hub: s.hub, title: 'Image', required: [],
      blocks: [{ kind: 'IMAGE', body: 'asset:missing', alt: 'Image', required: [] }] }))
      .rejects.toBeInstanceOf(ArticleError);
    expect(await new DocumentingConcept(s.db)._documents({ scope: s.hub })).toEqual([]);
  });
});
