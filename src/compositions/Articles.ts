import type { Db } from 'mongodb';
import { SessioningConcept } from '@/concepts/Sessioning/Sessioning.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';
import { DocumentingConcept, DocumentTitleTaken, type BlockInput } from '@/concepts/Documenting/Documenting.ts';
import { RequirementTaggingConcept, RequirementRuleNotFound } from '@/concepts/RequirementTagging/RequirementTagging.ts';
import { MediaAssetManagingConcept } from '@/concepts/MediaAssetManaging/MediaAssetManaging.ts';
import { registerOperationRecovery, runOperation, withApplicationLock, type PendingOperation } from
  '@/operations/Coordinator.ts';

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
  async function identity(secret: string): Promise<string> {
    const user = (await new SessioningConcept(db, clock).use({ session: secret })).user;
    if (!(await new RegisteringConcept(db)._user({ user })).length) throw new ArticleError('UNAUTHENTICATED');
    return user;
  }

  async function hubSequence(hub: string): Promise<string> {
    if (!(await new HubCataloguingConcept(db)._get({ hub })).length) throw new ArticleError('HUB_NOT_FOUND');
    const sequence = (await new CheckpointingConcept(db)._sequences({ scope: hub }))[0]?.sequence;
    if (!sequence) throw new ArticleError('SEQUENCE_NOT_FOUND');
    return sequence;
  }

  async function validateRules(hub: string, sequence: string, required: string[], blocks: RuleBlock[],
  ): Promise<void> {
    if (!validTokens(required) || !validRuleBlocks(blocks)) throw new ArticleError('INVALID_ARTICLE');
    const checkpoints = new CheckpointingConcept(db);
    for (const tokens of [required, ...blocks.map((block) => block.required)]) {
      if (!(await checkpoints._contains({ scope: hub, sequence, tokens })).valid) {
        throw new ArticleError('INVALID_REQUIREMENTS');
      }
    }
    const assets = new MediaAssetManagingConcept(db);
    for (const block of blocks) {
      if (block.kind !== 'TEXT') {
        const asset = (await assets._get({ asset: block.body }))[0];
        if (!asset || asset.status !== 'READY' || asset.kind !== block.kind) throw new ArticleError('ASSET_NOT_READY');
      }
    }
  }

  async function article(hub: string, document: string) {
    const row = (await new DocumentingConcept(db)._documentForEditing({ scope: hub, document }))[0];
    if (!row) throw new ArticleError('ARTICLE_NOT_FOUND');
    return row;
  }

  async function hubCreator(hub: string): Promise<string> {
    const row = (await new HubCataloguingConcept(db)._get({ hub }))[0];
    if (!row) throw new ArticleError('HUB_NOT_FOUND');
    return row.creator;
  }

  async function createArticle(secret: string, input: ArticleInput) {
    const user = await identity(secret);
    if (typeof input.hub !== 'string' || typeof input.title !== 'string') throw new ArticleError('INVALID_ARTICLE');
    return runOperation({ db, kind: 'article.create', actor: user,
      payload: { input },
      prepare: async () => {
        const sequence = await hubSequence(input.hub);
        await validateRules(input.hub, sequence, input.required, input.blocks);
        for (const { document } of await new DocumentingConcept(db)._documents({ scope: input.hub })) {
          if ((await new DocumentingConcept(db)._title({ scope: input.hub, document }))[0]?.title === input.title.trim()) {
            throw new DocumentTitleTaken();
          }
        }
      },
      work: async () => {
        const documents = new DocumentingConcept(db);
        const rules = new RequirementTaggingConcept(db);
        const { document } = await documents.create({ scope: input.hub, author: user,
          title: input.title, blocks: input.blocks });
        const blocks = await documents._blocks({ scope: input.hub, document });
        for (const [index, block] of blocks.entries()) {
          await rules.tag({ item: block.block, required: input.blocks[index]!.required });
        }
        // The article rule is the visibility gate and is always written last.
        await rules.tag({ item: document, required: input.required });
        return { document, blocks };
      },
    });
  }

  async function editingView(secret: string, hub: string, document: string) {
    await identity(secret);
    return withApplicationLock(db, async () => {
      // Public article routes use the title; the authoring API historically used
      // the stable document ID. Resolve an exact scoped title only when no ID matches.
      let resolvedDocument = document;
      let current = await new DocumentingConcept(db)
        ._documentForEditing({ scope: hub, document: resolvedDocument }).then((rows) => rows[0]);
      if (!current) {
        const documents = new DocumentingConcept(db);
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
      const found = await new RequirementTaggingConcept(db)._rulesForItems({ items });
      const rules = new Map(found.map(({ item, required }) => [item, required]));
      return { document: resolvedDocument, title: current.title, author: current.author,
        required: rules.get(resolvedDocument) ?? null,
        blocks: current.blocks.map((block) => ({ ...block, required: rules.get(block.block) ?? null })) };
    });
  }

  async function saveArticle(secret: string, input: SaveInput) {
    const user = await identity(secret);
    if (typeof input.hub !== 'string' || typeof input.document !== 'string' ||
      (input.title !== undefined && typeof input.title !== 'string')) throw new ArticleError('INVALID_ARTICLE');
    return runOperation({ db, kind: 'article.save', actor: user, payload: { input },
      prepare: async () => {
        const current = await article(input.hub, input.document);
        const sequence = await hubSequence(input.hub);
        await validateRules(input.hub, sequence, input.required, input.blocks);
        if (input.title !== undefined && input.title.trim() !== current.title) {
          for (const { document } of await new DocumentingConcept(db)._documents({ scope: input.hub })) {
            if (document !== input.document &&
              (await new DocumentingConcept(db)._title({ scope: input.hub, document }))[0]?.title === input.title.trim()) {
              throw new DocumentTitleTaken();
            }
          }
        }
        return current;
      },
      work: async (current) => {
        const documents = new DocumentingConcept(db);
        const rules = new RequirementTaggingConcept(db);
        if ((await rules._rule({ item: input.document })).length) await rules.untag({ item: input.document });
        const { blocks } = await documents.update({ scope: input.hub, document: input.document,
          blocks: input.blocks });
        if (input.title !== undefined && input.title !== current.title) {
          await documents.rename({ scope: input.hub, document: input.document, title: input.title });
        }
        const surviving = new Set(blocks.map(({ block }) => block));
        for (const { block } of current.blocks) {
          if (!surviving.has(block) && (await rules._rule({ item: block })).length) await rules.untag({ item: block });
        }
        for (const [index, block] of blocks.entries()) {
          await rules.tag({ item: block.block, required: input.blocks[index]!.required });
        }
        await rules.tag({ item: input.document, required: input.required });
        return { document: input.document, title: input.title ?? current.title, blocks };
      },
    });
  }

  async function scopedItem(hub: string, document: string, item: string) {
    const current = await article(hub, document);
    if (item !== document && !current.blocks.some(({ block }) => block === item)) {
      throw new ArticleError('ITEM_NOT_FOUND');
    }
  }

  async function tagItem(secret: string, hub: string, document: string, item: string, required: string[]) {
    const user = await identity(secret);
    return withApplicationLock(db, async () => {
      await scopedItem(hub, document, item);
      const sequence = await hubSequence(hub);
      if (!validTokens(required) ||
        !(await new CheckpointingConcept(db)._contains({ scope: hub, sequence, tokens: required })).valid) {
        throw new ArticleError('INVALID_REQUIREMENTS');
      }
      const root = item === document ? undefined : (await new RequirementTaggingConcept(db)._rule({ item: document }))[0];
      const payload = { hub, document, item, required, rootRequired: root?.required };
      return runOperation({ db, kind: 'article.tag', actor: user, payload,
        work: async () => {
          await applyTag(document, item, required, root?.required);
          return { item };
        },
      });
    });
  }

  async function untagItem(secret: string, hub: string, document: string, item: string) {
    const user = await identity(secret);
    return withApplicationLock(db, async () => {
      await scopedItem(hub, document, item);
      if (!(await new RequirementTaggingConcept(db)._rule({ item })).length) throw new RequirementRuleNotFound();
      const root = item === document ? undefined : (await new RequirementTaggingConcept(db)._rule({ item: document }))[0];
      const payload = { hub, document, item, rootRequired: root?.required };
      return runOperation({ db, kind: 'article.untag', actor: user, payload,
        work: async () => {
          await applyUntag(document, item, root?.required);
          return { item };
        },
      });
    });
  }

  async function applyTag(document: string, item: string, required: string[],
    rootRequired?: string[]) {
    const rules = new RequirementTaggingConcept(db);
    if (item === document) { await rules.tag({ item, required }); return; }
    if (rootRequired !== undefined && (await rules._rule({ item: document })).length) await rules.untag({ item: document });
    await rules.tag({ item, required });
    if (rootRequired !== undefined) await rules.tag({ item: document, required: rootRequired });
  }

  async function applyUntag(document: string, item: string, rootRequired?: string[]) {
    const rules = new RequirementTaggingConcept(db);
    if (item === document) {
      if ((await rules._rule({ item })).length) await rules.untag({ item });
      return;
    }
    if (rootRequired !== undefined && (await rules._rule({ item: document })).length) await rules.untag({ item: document });
    if ((await rules._rule({ item })).length) await rules.untag({ item });
    if (rootRequired !== undefined) await rules.tag({ item: document, required: rootRequired });
  }

  async function deleteArticle(secret: string, hub: string, document: string) {
    const user = await identity(secret);
    if (await hubCreator(hub) !== user) throw new ArticleError('FORBIDDEN');
    return runOperation({ db, kind: 'article.delete', actor: user, payload: { hub, document },
      prepare: () => article(hub, document),
      work: async () => deleteArticleContent(hub, document),
    });
  }

  async function deleteArticleContent(hub: string, document: string) {
    const current = await article(hub, document).catch((error) => {
      if (error instanceof ArticleError && error.code === 'ARTICLE_NOT_FOUND') return undefined;
      throw error;
    });
    if (!current) return { document };
    const rules = new RequirementTaggingConcept(db);
    // Remove the document visibility gate before touching block rules or content.
    if ((await rules._rule({ item: document })).length) await rules.untag({ item: document });
    for (const item of current.blocks.map(({ block }) => block)) {
      if ((await rules._rule({ item })).length) await rules.untag({ item });
    }
    await new DocumentingConcept(db).delete({ scope: hub, document });
    return { document };
  }

  async function asRecoveryUser<T>(user: string, work: (secret: string) => Promise<T>): Promise<T> {
    const sessions = new SessioningConcept(db, clock);
    const { session } = await sessions.start({ user });
    try { return await work(session); }
    finally { await sessions.end({ session }); }
  }

  registerOperationRecovery(db, 'article.create', async (operation: PendingOperation) => {
    const input = operation.payload.input as ArticleInput;
    return asRecoveryUser(operation.actor, async (secret) => {
      const documents = new DocumentingConcept(db);
      let existing: { document: string; title: string; author: string; blocks: Awaited<ReturnType<typeof documents._blocks>> } | undefined;
      for (const { document } of await documents._documents({ scope: input.hub })) {
        const title = (await documents._title({ scope: input.hub, document }))[0]?.title;
        if (title !== input.title.trim()) continue;
        const row = (await documents._documentForEditing({ scope: input.hub, document }))[0];
        if (row?.author === operation.actor) existing = { document, ...row };
        break;
      }
      if (!existing) return createArticle(secret, input);
      const blocks = input.blocks.map((block, index) => ({
        ...block, block: existing!.blocks[index]?.block,
      }));
      return saveArticle(secret, { hub: input.hub, document: existing.document,
        title: input.title, required: input.required, blocks });
    });
  });
  registerOperationRecovery(db, 'article.save', (operation) =>
    asRecoveryUser(operation.actor, (secret) => saveArticle(secret, operation.payload.input as SaveInput)));
  registerOperationRecovery(db, 'article.tag', async (operation) => {
    const { document, item, required, rootRequired } = operation.payload as {
      hub: string; document: string; item: string; required: string[]; rootRequired?: string[];
    };
    await applyTag(document, item, required, rootRequired);
    return { item };
  });
  registerOperationRecovery(db, 'article.untag', async (operation) => {
    const { document, item, rootRequired } = operation.payload as {
      hub: string; document: string; item: string; rootRequired?: string[];
    };
    await applyUntag(document, item, rootRequired);
    return { item };
  });
  registerOperationRecovery(db, 'article.delete', async (operation) => {
    const { hub, document } = operation.payload as { hub: string; document: string };
    return deleteArticleContent(hub, document);
  });

  return {
    CreateArticle: createArticle, EditingView: editingView, SaveArticle: saveArticle,
    TagItem: tagItem, UntagItem: untagItem, DeleteArticle: deleteArticle,
  };
}
