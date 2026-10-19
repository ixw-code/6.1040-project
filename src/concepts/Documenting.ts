import { MongoServerError, type Db } from 'mongodb';

export class DocumentNameRequired extends Error {}
export class DocumentNameTaken extends Error {}
export class InvalidDocumentBlocks extends Error {}

export type BlockKind = 'TEXT' | 'IMAGE';
export type BlockInput = { kind: BlockKind; body: string; alt: string };
export type DocumentBlock = BlockInput & { block: string };

type StoredBlock = Omit<DocumentBlock, 'kind'> & { kind: BlockKind | 'TITLE' };
type DocumentRecord = { _id: string; scope: string; title?: string; blocks: StoredBlock[] };

/** Documents of raw content blocks. */
export class DocumentingConcept {
  private readonly documents;

  constructor(db: Db) {
    this.documents = db.collection<DocumentRecord>('documents');
  }

  async create({ scope, title, blocks }: {
    scope: string; title: string; blocks: BlockInput[];
  }): Promise<{ document: string }> {
    const trimmed = title.trim();
    if (!trimmed) throw new DocumentNameRequired();
    if (await this.documents.findOne({ scope, title: trimmed }, { projection: { _id: 1 } })) {
      throw new DocumentNameTaken();
    }
    if (!Array.isArray(blocks) || blocks.some((block) =>
      !block || (block.kind !== 'TEXT' && block.kind !== 'IMAGE') ||
      typeof block.body !== 'string' || typeof block.alt !== 'string' ||
      (block.kind === 'IMAGE' && !block.alt.trim())
    )) throw new InvalidDocumentBlocks();

    const document = `document:${crypto.randomUUID()}`;
    try {
      await this.documents.insertOne({
        _id: document,
        scope,
        title: trimmed,
        blocks: blocks.map(({ kind, body, alt }) => ({
          block: `block:${crypto.randomUUID()}`, kind, body, alt,
        })),
      });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) throw new DocumentNameTaken();
      throw error;
    }
    return { document };
  }

  async _documents({ scope }: { scope: string }): Promise<{ document: string }[]> {
    const rows = await this.documents.find({ scope }, { projection: { _id: 1 } })
      .sort({ _id: 1 }).toArray();
    return rows.map(({ _id }) => ({ document: _id }));
  }

  async _title({ scope, document }: { scope: string; document: string }): Promise<{ title: string }[]> {
    const doc = await this.documents.findOne({ _id: document, scope }, { projection: { title: 1 } });
    return doc?.title === undefined ? [] : [{ title: doc.title }];
  }

  async _blocks({ scope, document }: {
    scope: string; document: string;
  }): Promise<DocumentBlock[]> {
    const doc = await this.documents.findOne({ _id: document, scope });
    return doc ? doc.blocks.filter((block): block is DocumentBlock => block.kind !== 'TITLE')
      .map((block) => ({ ...block })) : [];
  }
}
