import type { Db } from 'mongodb';

export type BlockKind = 'TITLE' | 'TEXT' | 'IMAGE';
export type BlockInput = { kind: BlockKind; body: string; alt: string };
export type DocumentBlock = BlockInput & { block: string };

type DocumentRecord = { _id: string; scope: string; blocks: DocumentBlock[] };

/** Documents of raw content blocks. */
export class DocumentingConcept {
  private readonly documents;

  constructor(db: Db) {
    this.documents = db.collection<DocumentRecord>('documents');
  }

  async create({ scope, blocks }: { scope: string; blocks: BlockInput[] }): Promise<{ document: string }> {
    const document = crypto.randomUUID();
    await this.documents.insertOne({
      _id: document,
      scope,
      blocks: blocks.map(({ kind, body, alt }) => ({
        block: crypto.randomUUID(), kind, body, alt,
      })),
    });
    return { document };
  }

  async _documents({ scope }: { scope: string }): Promise<{ document: string }[]> {
    const rows = await this.documents.find({ scope }, { projection: { _id: 1 } })
      .sort({ _id: 1 }).toArray();
    return rows.map(({ _id }) => ({ document: _id }));
  }

  async _blocks({ scope, document }: {
    scope: string; document: string;
  }): Promise<DocumentBlock[]> {
    const doc = await this.documents.findOne({ _id: document, scope });
    return doc ? doc.blocks.map((block) => ({ ...block })) : [];
  }
}
