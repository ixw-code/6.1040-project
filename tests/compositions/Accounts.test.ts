import { describe, expect, test } from 'bun:test';
import { ObjectId } from 'mongodb';
import { createAccounts } from '@/assembly/accounts.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { MediaAssetManagingConcept } from '@/concepts/MediaAssetManaging/MediaAssetManaging.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { SessioningConcept, SessionInvalid } from '@/concepts/Sessioning/Sessioning.ts';
import { AccountOwnsHubs } from '@/assembly/accounts.ts';
import { GridFsMedia } from '@/storage/GridFsMedia.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

describe('Accounts local composition', () => {
  const mongo = useMongoTestDb();

  test('registers only through explicit Register, then logs in and resolves the current user', async () => {
    const { gateway } = createAccounts(mongo.db());
    const newIdentity = await gateway.invoke('/accounts/login', {
      provider: 'GOOGLE', providerSubject: 'subject-1',
    });
    expect(newIdentity).toMatchObject({ ok: false, error: { kind: 'domain', value: 'ACCOUNT_NOT_FOUND' } });
    expect(await mongo.db().collection('registering.users').countDocuments()).toBe(0);

    const created = await gateway.invoke('/accounts/register', {
      username: 'Alice', provider: 'GOOGLE', providerSubject: 'subject-1',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { user, session } = created.value as { user: string; session: string };
    expect(await gateway.invoke('/accounts/current', { session })).toMatchObject({
      ok: true, value: { user, username: 'Alice', provider: 'GOOGLE' },
    });
    expect(await gateway.invoke('/accounts/set-username', { session, username: 'Alice2' }))
      .toMatchObject({ ok: true, value: { user, username: 'Alice2' } });
    const again = await gateway.invoke('/accounts/login', {
      provider: 'GOOGLE', providerSubject: 'subject-1',
    });
    expect(again).toMatchObject({ ok: true, value: { user } });
    expect(await gateway.invoke('/accounts/logout', { session }))
      .toMatchObject({ ok: true, value: { ended: true } });
    expect((await gateway.invoke('/accounts/current', { session })).ok).toBe(false);
  });

  test('refuses deletion before mutation while the user owns a hub', async () => {
    const db = mongo.db();
    const { deleteAccount } = createAccounts(db);
    const registering = new RegisteringConcept(db);
    const sessioning = new SessioningConcept(db);
    const progress = new ProgressRecordingConcept(db);
    const { user } = await registering.register({
      username: 'Owner', provider: 'GOOGLE', providerSubject: 'owner-subject',
    });
    const { session } = await sessioning.start({ user });
    await new HubCataloguingConcept(db).create({ name: 'Owned Hub', creator: user });
    await progress.record({ scope: 'owned-hub', reader: user, checkpoint: 'checkpoint-1' });

    await expect(deleteAccount(session)).rejects.toBeInstanceOf(AccountOwnsHubs);
    expect(await registering._user({ user })).toHaveLength(1);
    expect(await sessioning.use({ session })).toEqual({ user });
    expect(await progress._checkpoint({ scope: 'owned-hub', reader: user }))
      .toEqual([{ checkpoint: 'checkpoint-1' }]);
    expect(await db.collection('wikiplotter_operations').countDocuments({ kind: 'account.delete' })).toBe(0);
  });

  test('deletes account data and media while preserving article references, then requires fresh registration', async () => {
    const db = mongo.db();
    const { gateway, deleteAccount } = createAccounts(db);
    const registering = new RegisteringConcept(db);
    const sessioning = new SessioningConcept(db);
    const progress = new ProgressRecordingConcept(db);
    const assets = new MediaAssetManagingConcept(db);
    const store = new GridFsMedia(db);
    const { user } = await registering.register({
      username: 'Reader', provider: 'GOOGLE', providerSubject: 'reader-subject',
    });
    const firstSession = await sessioning.start({ user });
    const secondSession = await sessioning.start({ user });
    await progress.record({ scope: 'hub-1', reader: user, checkpoint: 'checkpoint-1' });
    await progress.record({ scope: 'hub-2', reader: user, checkpoint: 'checkpoint-2' });

    const storageKey = new ObjectId().toHexString();
    const { asset } = await assets.create({
      uploader: user, filename: 'cover.png', storageKey, kind: 'IMAGE',
    });
    const bytes = Buffer.from('private media bytes');
    await store.put(storageKey, bytes);
    const article = { _id: 'article-1', scope: 'hub-1', title: 'Article',
      blocks: [{ _id: 'block-1', kind: 'IMAGE', body: asset, alt: 'cover' }] };
    const documents = db.collection<typeof article>('documents');
    await documents.insertOne(article);

    expect(await deleteAccount(firstSession.session)).toEqual({ deleted: true });
    expect(await registering._user({ user })).toEqual([]);
    expect(await registering._byProvider({ provider: 'GOOGLE', providerSubject: 'reader-subject' })).toEqual([]);
    await expect(sessioning.use({ session: firstSession.session })).rejects.toBeInstanceOf(SessionInvalid);
    await expect(sessioning.use({ session: secondSession.session })).rejects.toBeInstanceOf(SessionInvalid);
    expect(await progress._scopesForReader({ reader: user })).toEqual([]);
    expect(await assets._get({ asset })).toEqual([]);
    expect(await store.get(storageKey)).toBeUndefined();
    expect(await documents.findOne({ _id: article._id })).toEqual(article);
    expect(await gateway.invoke('/accounts/login', {
      provider: 'GOOGLE', providerSubject: 'reader-subject',
    })).toMatchObject({ ok: false, error: { kind: 'domain', value: 'ACCOUNT_NOT_FOUND' } });

    const fresh = await gateway.invoke('/accounts/register', {
      username: 'Reader2', provider: 'GOOGLE', providerSubject: 'reader-subject',
    });
    expect(fresh.ok).toBe(true);
    if (fresh.ok) expect((fresh.value as { user: string }).user).not.toBe(user);
  });
});
