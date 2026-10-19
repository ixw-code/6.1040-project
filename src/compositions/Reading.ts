import { endpoint, receive, respond } from '@mit-sdg/sync-engine/boundary';
import { each, former, no, view, where } from '@mit-sdg/sync-engine/language';
import { concepts } from '@/concepts.ts';

const { HubCataloguing, Checkpointing, ProgressRecording, Documenting, RequirementTagging } = concepts;

const ExistingHub = view('reading hub', ({ hub }) =>
  where(HubCataloguing._hubs({}).is({ hub })),
).holds();

const ReaderSelection = view('reading selection', ({ hub, reader }, { tokens }, { sequence, checkpoint }) =>
  where(
    ExistingHub({ hub }),
    Checkpointing._sequences({ scope: hub }).is({ sequence }),
    ProgressRecording._checkpoint({ scope: hub, reader }).is({ checkpoint }),
    Checkpointing._prefixTokens({ scope: hub, sequence, checkpoint }).is({ tokens }),
  ),
).optional();

const ReadableDocument = view('readable document', ({ hub, tokens }, { document }) =>
  where(
    Documenting._documents({ scope: hub }).is({ document }),
    RequirementTagging._eligible({ item: document, tokens }).is({ eligible: true }),
  ),
).many();

const EligibleBlock = view('eligible block', ({ hub, document, tokens }, { block, kind, body, alt }) =>
  where(
    Documenting._blocks({ scope: hub, document }).is({ block, kind, body, alt }),
    RequirementTagging._eligible({ item: block, tokens }).is({ eligible: true }),
  ),
).many();

const HubDirectory = former('reading hub directory', (_input, { hub, name }) =>
  each(HubCataloguing._hubs({}).is({ hub, name }))
    .form({ hub: hub!, name: name! }),
);

const DocumentDirectory = former('reading document directory', ({ hub, tokens }, { document, title }) =>
  each(ReadableDocument({ hub, tokens }).is({ document }))
    .where(Documenting._title({ scope: hub, document: document! }).is({ title }))
    .form({ document: document!, title: title! }),
);

const DocumentContent = former('reading document content',
  ({ hub, document, tokens }, { title, block, kind, body, alt }) =>
    where(Documenting._title({ scope: hub, document }).is({ title }))
      .form({
        document: document!,
        title: title!,
        blocks: each(EligibleBlock({ hub, document, tokens }).is({ block, kind, body, alt }))
          .form({ block: block!, kind: kind!, body: body!, alt: alt! }),
      }),
);

const validHubReader = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false as const, detail: 'hub and reader must be nonblank strings' };
  }
  const input = value as Record<string, unknown>;
  return typeof input.hub === 'string' && !!input.hub.trim() &&
    typeof input.reader === 'string' && !!input.reader.trim() &&
    (!('document' in input) || (typeof input.document === 'string' && !!input.document.trim()))
    ? { ok: true as const } : { ok: false as const, detail: 'hub, reader, and document must be nonblank strings' };
};

const ListHubs = endpoint('/hubs/list', () =>
  receive({}).then(respond({ hubs: HubDirectory({}) })),
  { input: { required: [] } },
);

const BrowseHub = endpoint('/hubs/browse', ({ hub, reader, tokens }) =>
  receive({ hub, reader }).then(
    where(ReaderSelection({ hub, reader }).is({ tokens }))
      .then(respond({ documents: DocumentDirectory({ hub, tokens }) })).named('valid-selection'),
    where(no(ExistingHub({ hub })))
      .then(respond({ error: 'HUB_NOT_FOUND' })).named('hub-missing'),
    where(ExistingHub({ hub }), no(ReaderSelection({ hub, reader })))
      .then(respond({ error: 'PROGRESS_NOT_SET' })).named('selection-missing'),
  ), { input: { required: ['hub', 'reader'] }, validators: { input: validHubReader } },
);

const ReadDocument = endpoint('/content/documents/read', ({ hub, reader, document, tokens }) =>
  receive({ hub, reader, document }).then(
    where(ReaderSelection({ hub, reader }).is({ tokens }), ReadableDocument({ hub, tokens }).is({ document }))
      .then(respond({ content: DocumentContent({ hub, document, tokens }) })).named('readable-document'),
    where(ReaderSelection({ hub, reader }).is({ tokens }), no(ReadableDocument({ hub, tokens }).is({ document })))
      .then(respond({ content: null })).named('unavailable-document'),
    where(no(ExistingHub({ hub })))
      .then(respond({ error: 'HUB_NOT_FOUND' })).named('hub-missing'),
    where(ExistingHub({ hub }), no(ReaderSelection({ hub, reader })))
      .then(respond({ error: 'PROGRESS_NOT_SET' })).named('selection-missing'),
  ), { input: { required: ['hub', 'reader', 'document'] }, validators: { input: validHubReader } },
);

export const composition = {
  ListHubs, BrowseHub, ReadDocument, ExistingHub, ReaderSelection, ReadableDocument,
  EligibleBlock, HubDirectory, DocumentDirectory, DocumentContent,
};
