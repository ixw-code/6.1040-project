/** Documents with raw block data. */
export type BlockKind = 'TITLE' | 'TEXT' | 'IMAGE';
export type BlockInput = { kind: BlockKind; body: string; alt: string };
export type DocumentBlock = BlockInput & { block: string };

type DocumentRecord = { document: string; scope: string; blocks: DocumentBlock[] };

export class DocumentingConcept {
  private readonly documents = new Map<string, DocumentRecord>();

  async create({ scope, blocks }: { scope: string; blocks: BlockInput[] }): Promise<{ document: string }> {
    const document = crypto.randomUUID();
    this.documents.set(document, {
      document,
      scope,
      blocks: blocks.map(({ kind, body, alt }) => ({
        block: crypto.randomUUID(), kind, body, alt,
      })),
    });
    return { document };
  }

  async _documents({ scope }: { scope: string }): Promise<{ document: string }[]> {
    return [...this.documents.values()]
      .filter((doc) => doc.scope === scope)
      .map(({ document }) => ({ document }))
      .sort((a, b) => a.document < b.document ? -1 : a.document > b.document ? 1 : 0);
  }

  async _blocks({ scope, document }: {
    scope: string; document: string;
  }): Promise<DocumentBlock[]> {
    const doc = this.documents.get(document);
    if (!doc || doc.scope !== scope) return [];
    return doc.blocks.map((block) => ({ ...block }));
  }
}
