import type { ClientSession, Db } from 'mongodb';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';
import { DocumentingConcept, type BlockInput } from '@/concepts/Documenting/Documenting.ts';
import { RequirementTaggingConcept } from '@/concepts/RequirementTagging/RequirementTagging.ts';
import { MediaAssetManagingConcept } from '@/concepts/MediaAssetManaging/MediaAssetManaging.ts';

export class ArticleError extends Error {
  constructor(readonly code: string) { super(code); }
}

export type RuleBlock = BlockInput & { required: string[] };
export type ArticleInput = { hub: string; title: string; blocks: RuleBlock[]; required: string[] };
export type SaveInput = { hub: string; document: string; title?: string; blocks: RuleBlock[]; required: string[] };

function validTokens(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((token) => typeof token === 'string' && !!token);
}

function validRuleBlocks(value: unknown): value is RuleBlock[] {
  return Array.isArray(value) && value.every((block) => block && typeof block === 'object' &&
    ['TEXT', 'IMAGE', 'VIDEO'].includes(block.kind) && typeof block.body === 'string' &&
    typeof block.alt === 'string' && (block.kind !== 'IMAGE' || !!block.alt.trim()) &&
    (block.block === undefined || typeof block.block === 'string') && validTokens(block.required));
}

/** Multi-concept saves iterate a dynamic block set, so storage coordination lives here. */
export function createArticles(db: Db, clock?: () => Date) {
  async function transact<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = db.client.startSession();
    try {
      return await session.withTransaction(() => work(session),
        { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } finally { await session.endSession(); }
  }

  async function identity(secret: string): Promise<string> {
    const user = (await new SessioningConcept(db, clock).use({ session: secret })).user;
    if (!(await new RegisteringConcept(db)._user({ user })).length) throw new ArticleError('UNAUTHENTICATED');
    return user;
  }

  async function hubSequence(hub: string, session: ClientSession): Promise<string> {
    if (!(await new HubCataloguingConcept(db, session)._get({ hub })).length) throw new ArticleError('HUB_NOT_FOUND');
    const sequence = (await new CheckpointingConcept(db, session)._sequences({ scope: hub }))[0]?.sequence;
    if (!sequence) throw new ArticleError('SEQUENCE_NOT_FOUND');
    return sequence;
  }

  async function validateRules(hub: string, sequence: string, required: string[], blocks: RuleBlock[],
    session: ClientSession): Promise<void> {
    if (!validTokens(required) || !validRuleBlocks(blocks)) throw new ArticleError('INVALID_ARTICLE');
    const checkpoints = new CheckpointingConcept(db, session);
    for (const tokens of [required, ...blocks.map((block) => block.required)]) {
      if (!(await checkpoints._contains({ scope: hub, sequence, tokens })).valid) {
        throw new ArticleError('INVALID_REQUIREMENTS');
      }
    }
    const assets = new MediaAssetManagingConcept(db, session);
    for (const block of blocks) {
      if (block.kind !== 'TEXT') {
        try { await assets.confirmReadyReference({ asset: block.body, kind: block.kind }); }
        catch { throw new ArticleError('ASSET_NOT_READY'); }
      }
    }
  }

  async function article(hub: string, document: string, session: ClientSession) {
    const row = (await new DocumentingConcept(db, session)._documentForEditing({ scope: hub, document }))[0];
    if (!row) throw new ArticleError('ARTICLE_NOT_FOUND');
    return row;
  }

  async function hubCreator(hub: string, session: ClientSession): Promise<string> {
    const row = (await new HubCataloguingConcept(db, session)._get({ hub }))[0];
    if (!row) throw new ArticleError('HUB_NOT_FOUND');
    return row.creator;
  }

  async function createArticle(secret: string, input: ArticleInput) {
    const user = await identity(secret);
    if (typeof input.hub !== 'string' || typeof input.title !== 'string') throw new ArticleError('INVALID_ARTICLE');
    return transact(async (session) => {
      const sequence = await hubSequence(input.hub, session);
      await validateRules(input.hub, sequence, input.required, input.blocks, session);
      const documents = new DocumentingConcept(db, session);
      const rules = new RequirementTaggingConcept(db, session);
      const { document } = await documents.create({ scope: input.hub, author: user,
        title: input.title, blocks: input.blocks });
      const blocks = await documents._blocks({ scope: input.hub, document });
      await rules.tag({ item: document, required: input.required });
      for (const [index, block] of blocks.entries()) {
        await rules.tag({ item: block.block, required: input.blocks[index]!.required });
      }
      return { document, blocks };
    });
  }

  async function editingView(secret: string, hub: string, document: string) {
    await identity(secret);
    return transact(async (session) => {
      // Public article routes use the title; the authoring API historically used
      // the stable document ID. Resolve an exact scoped title only when no ID matches.
      let resolvedDocument = document;
      let current = await new DocumentingConcept(db, session)
        ._documentForEditing({ scope: hub, document: resolvedDocument }).then((rows) => rows[0]);
      if (!current) {
        const documents = new DocumentingConcept(db, session);
        for (const row of await documents._documents({ scope: hub })) {
          if ((await documents._title({ scope: hub, document: row.document }))[0]?.title === document) {
            resolvedDocument = row.document;
            current = (await documents._documentForEditing({ scope: hub, document: resolvedDocument }))[0];
            break;
          }
        }
      }
      if (!current) throw new ArticleError('ARTICLE_NOT_FOUND');
      const items = [resolvedDocument, ...current.blocks.map(({ block }) => block)];
      const found = await new RequirementTaggingConcept(db, session)._rulesForItems({ items });
      const rules = new Map(found.map(({ item, required }) => [item, required]));
      return { document: resolvedDocument, title: current.title, author: current.author,
        required: rules.get(resolvedDocument) ?? null,
        blocks: current.blocks.map((block) => ({ ...block, required: rules.get(block.block) ?? null })) };
    });
  }

  async function saveArticle(secret: string, input: SaveInput) {
    await identity(secret);
    if (typeof input.hub !== 'string' || typeof input.document !== 'string' ||
      (input.title !== undefined && typeof input.title !== 'string')) throw new ArticleError('INVALID_ARTICLE');
    return transact(async (session) => {
      const current = await article(input.hub, input.document, session);
      const sequence = await hubSequence(input.hub, session);
      await validateRules(input.hub, sequence, input.required, input.blocks, session);
      const documents = new DocumentingConcept(db, session);
      const rules = new RequirementTaggingConcept(db, session);
      const { blocks } = await documents.update({ scope: input.hub, document: input.document,
        blocks: input.blocks });
      if (input.title !== undefined && input.title !== current.title) {
        await documents.rename({ scope: input.hub, document: input.document, title: input.title });
      }
      const surviving = new Set(blocks.map(({ block }) => block));
      for (const { block } of current.blocks) {
        if (!surviving.has(block) && (await rules._rule({ item: block })).length) await rules.untag({ item: block });
      }
      await rules.tag({ item: input.document, required: input.required });
      for (const [index, block] of blocks.entries()) {
        await rules.tag({ item: block.block, required: input.blocks[index]!.required });
      }
      return { document: input.document, title: input.title ?? current.title, blocks };
    });
  }

  async function scopedItem(hub: string, document: string, item: string, session: ClientSession) {
    const current = await article(hub, document, session);
    if (item !== document && !current.blocks.some(({ block }) => block === item)) {
      throw new ArticleError('ITEM_NOT_FOUND');
    }
  }

  async function tagItem(secret: string, hub: string, document: string, item: string, required: string[]) {
    await identity(secret);
    return transact(async (session) => {
      await scopedItem(hub, document, item, session);
      const sequence = await hubSequence(hub, session);
      if (!validTokens(required) ||
        !(await new CheckpointingConcept(db, session)._contains({ scope: hub, sequence, tokens: required })).valid) {
        throw new ArticleError('INVALID_REQUIREMENTS');
      }
      await new RequirementTaggingConcept(db, session).tag({ item, required });
      return { item };
    });
  }

  async function untagItem(secret: string, hub: string, document: string, item: string) {
    await identity(secret);
    return transact(async (session) => {
      await scopedItem(hub, document, item, session);
      await new RequirementTaggingConcept(db, session).untag({ item });
      return { item };
    });
  }

  async function deleteArticle(secret: string, hub: string, document: string) {
    const user = await identity(secret);
    return transact(async (session) => {
      if (await hubCreator(hub, session) !== user) throw new ArticleError('FORBIDDEN');
      const current = await article(hub, document, session);
      const rules = new RequirementTaggingConcept(db, session);
      for (const item of [document, ...current.blocks.map(({ block }) => block)]) {
        if ((await rules._rule({ item })).length) await rules.untag({ item });
      }
      await new DocumentingConcept(db, session).delete({ scope: hub, document });
      return { document };
    });
  }

  return {
    CreateArticle: createArticle, EditingView: editingView, SaveArticle: saveArticle,
    TagItem: tagItem, UntagItem: untagItem, DeleteArticle: deleteArticle,
  };
}
