import { MongoServerError, type ClientSession, type Db } from 'mongodb';

export class DocumentTitleRequired extends Error {}
export class DocumentTitleTaken extends Error {}
export class InvalidDocumentBlocks extends Error {}
export class DocumentNotFound extends Error {}

export type BlockKind = 'TEXT' | 'IMAGE' | 'VIDEO';
export type BlockInput = { kind: BlockKind; body: string; alt: string; block?: string };
export type DocumentBlock = BlockInput & { block: string };

type StoredBlock = Omit<DocumentBlock, 'kind'> & { kind: BlockKind | 'TITLE' };
type DocumentRecord = { _id: string; scope: string; title?: string; author?: string; blocks: StoredBlock[] };

function validBlocks(blocks: BlockInput[], existing?: Set<string>): boolean {
  if (!Array.isArray(blocks)) return false;
  const used = new Set<string>();
  return blocks.every((block) => {
    if (!block || !['TEXT', 'IMAGE', 'VIDEO'].includes(block.kind) ||
      typeof block.body !== 'string' || typeof block.alt !== 'string' ||
      (block.kind === 'IMAGE' && !block.alt.trim())) return false;
    if (block.block !== undefined) {
      if (typeof block.block !== 'string' || !existing?.has(block.block) || used.has(block.block)) return false;
      used.add(block.block);
    }
    return true;
  });
}

/** Documents of raw content blocks. */
export class DocumentingConcept {
  private readonly documents;

  constructor(db: Db, private readonly session?: ClientSession) {
    this.documents = db.collection<DocumentRecord>('documents');
  }

  async create({ scope, author, title, blocks }: {
    scope: string; author: string; title: string; blocks: BlockInput[];
  }): Promise<{ document: string }> {
    const trimmed = title.trim();
    if (!trimmed) throw new DocumentTitleRequired();
    if (await this.documents.findOne({ scope, title: trimmed }, { projection: { _id: 1 }, session: this.session })) {
      throw new DocumentTitleTaken();
    }
    if (!validBlocks(blocks)) throw new InvalidDocumentBlocks();

    const document = `document:${crypto.randomUUID()}`;
    try {
      await this.documents.insertOne({
        _id: document,
        scope, author,
        title: trimmed,
        blocks: blocks.map(({ kind, body, alt }) => ({
          block: `block:${crypto.randomUUID()}`, kind, body, alt,
        })),
      }, { session: this.session });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) throw new DocumentTitleTaken();
      throw error;
    }
    return { document };
  }

  async update({ scope, document, blocks }: {
    scope: string; document: string; blocks: BlockInput[];
  }): Promise<{ document: string; blocks: DocumentBlock[] }> {
    const current = await this.documents.findOne({ _id: document, scope }, { session: this.session });
    if (!current) throw new DocumentNotFound();
    const existing = new Set(current.blocks.map(({ block }) => block));
    if (!validBlocks(blocks, existing)) throw new InvalidDocumentBlocks();
    const replacement = blocks.map(({ block, kind, body, alt }) => ({
      block: block ?? `block:${crypto.randomUUID()}`, kind, body, alt,
    }));
    const result = await this.documents.updateOne({ _id: document, scope },
      { $set: { blocks: replacement } }, { session: this.session });
    if (!result.matchedCount) throw new DocumentNotFound();
    return { document, blocks: replacement };
  }

  async rename({ scope, document, title }: {
    scope: string; document: string; title: string;
  }): Promise<{ title: string }> {
    if (!(await this.documents.findOne({ _id: document, scope }, { session: this.session }))) throw new DocumentNotFound();
    const trimmed = title.trim();
    if (!trimmed) throw new DocumentTitleRequired();
    try {
      const result = await this.documents.updateOne({ _id: document, scope },
        { $set: { title: trimmed } }, { session: this.session });
      if (!result.matchedCount) throw new DocumentNotFound();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) throw new DocumentTitleTaken();
      throw error;
    }
    return { title: trimmed };
  }

  async delete({ scope, document }: { scope: string; document: string }): Promise<{ document: string }> {
    const result = await this.documents.deleteOne({ _id: document, scope }, { session: this.session });
    if (!result.deletedCount) throw new DocumentNotFound();
    return { document };
  }

  async _documents({ scope }: { scope: string }): Promise<{ document: string }[]> {
    const rows = await this.documents.find({ scope }, { projection: { _id: 1 }, session: this.session })
      .sort({ _id: 1 }).toArray();
    return rows.map(({ _id }) => ({ document: _id }));
  }

  async _title({ scope, document }: { scope: string; document: string }): Promise<{ title: string }[]> {
    const doc = await this.documents.findOne({ _id: document, scope }, { projection: { title: 1 }, session: this.session });
    return doc?.title === undefined ? [] : [{ title: doc.title }];
  }

  async _blocks({ scope, document }: {
    scope: string; document: string;
  }): Promise<DocumentBlock[]> {
    const doc = await this.documents.findOne({ _id: document, scope }, { session: this.session });
    return doc ? doc.blocks.filter((block): block is DocumentBlock => block.kind !== 'TITLE')
      .map((block) => ({ ...block })) : [];
  }

  async _documentForEditing({ scope, document }: { scope: string; document: string }):
    Promise<{ title: string; author: string; blocks: DocumentBlock[] }[]> {
    const doc = await this.documents.findOne({ _id: document, scope }, { session: this.session });
    return doc?.title && doc.author ? [{ title: doc.title, author: doc.author,
      blocks: doc.blocks.filter((block) => block.kind !== 'TITLE').map((block) => ({ ...block, kind: block.kind as BlockKind })) }] : [];
  }

  async _authoredBy({ author }: { author: string }): Promise<{ scope: string; document: string }[]> {
    const rows = await this.documents.find({ author }, { session: this.session }).sort({ _id: 1 }).toArray();
    return rows.map(({ scope, _id }) => ({ scope, document: _id }));
  }
}
