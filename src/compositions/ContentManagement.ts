import { endpoint, receive, respond } from '@mit-sdg/sync-engine/boundary';
import { each, former, no, view, where } from '@mit-sdg/sync-engine/language';
import { concepts } from '@/assembly/concepts.ts';

const { HubCataloguing, Documenting, Checkpointing, RequirementTagging } = concepts;

const ExistingHub = view('content management hub', ({ hub }) =>
  where(HubCataloguing._hubs({}).is({ hub })),
).holds();

const ScopedDocument = view('document in hub', ({ hub, item }) =>
  where(ExistingHub({ hub }), Documenting._documents({ scope: hub }).is({ document: item })),
).holds();

const ScopedBlock = view('block in hub', ({ hub, item }, _output, { document }) =>
  where(
    ExistingHub({ hub }),
    Documenting._documents({ scope: hub }).is({ document }),
    Documenting._blocks({ scope: hub, document }).is({ block: item }),
  ),
).holds();

const AllowedRequirements = view('allowed hub requirements',
  ({ hub, required }, _output, { sequence }) => where(
    ExistingHub({ hub }),
    Checkpointing._sequences({ scope: hub }).is({ sequence }),
    Checkpointing._contains({ scope: hub, sequence, tokens: required }).is({ valid: true }),
  ),
).holds();

const CreatedDocument = former('created document blocks', ({ hub, document }, { block }) =>
  each(Documenting._blocks({ scope: hub, document }).is({ block })).form({ block: block! }),
);

const CreateDocument = endpoint('/setup/documents/create', ({ hub, title, blocks, document }) =>
  receive({ hub, title, blocks }).then(
    where(ExistingHub({ hub }))
      .then(Documenting.create({ scope: hub, author: 'legacy-setup', title, blocks }).responds({ document }))
      .then(respond({ document, blocks: CreatedDocument({ hub, document }) })).named('existing-hub'),
    where(no(ExistingHub({ hub })))
      .then(respond({ error: 'HUB_NOT_FOUND' })).named('missing-hub'),
  ), {
    input: { required: ['hub', 'title', 'blocks'] },
    validators: { input: (value) => {
      const record = value as Record<string, unknown>;
      return typeof record.hub === 'string' &&
        typeof record.title === 'string' && !!record.title.trim() &&
        Array.isArray(record.blocks) && record.blocks.every((block: unknown) => {
          if (!block || typeof block !== 'object' || Array.isArray(block)) return false;
          const item = block as Record<string, unknown>;
          return (item.kind === 'TEXT' || item.kind === 'IMAGE') &&
            typeof item.body === 'string' && typeof item.alt === 'string' &&
            (item.kind !== 'IMAGE' || !!item.alt.trim());
        }) ? { ok: true } : { ok: false, detail: 'hub, title, and blocks must be valid' };
    } },
  },
);

const TagItem = endpoint('/setup/items/tag', ({ hub, item, required }) =>
  receive({ hub, item, required }).then(
    where(ScopedDocument({ hub, item }), AllowedRequirements({ hub, required }))
      .then(RequirementTagging.tag({ item, required }))
      .then(respond({ item })).named('document-and-tokens-valid'),
    where(no(ScopedDocument({ hub, item })), ScopedBlock({ hub, item }), AllowedRequirements({ hub, required }))
      .then(RequirementTagging.tag({ item, required }))
      .then(respond({ item })).named('block-and-tokens-valid'),
    where(no(ScopedDocument({ hub, item })), no(ScopedBlock({ hub, item })))
      .then(respond({ error: 'ITEM_NOT_FOUND' })).named('item-missing'),
    where(ScopedDocument({ hub, item }), no(AllowedRequirements({ hub, required })))
      .then(respond({ error: 'INVALID_REQUIREMENTS' })).named('document-tokens-invalid'),
    where(no(ScopedDocument({ hub, item })), ScopedBlock({ hub, item }), no(AllowedRequirements({ hub, required })))
      .then(respond({ error: 'INVALID_REQUIREMENTS' })).named('block-tokens-invalid'),
  ), {
    input: { required: ['hub', 'item', 'required'] },
    validators: { input: (value) => {
      const record = value as Record<string, unknown>;
      return typeof record.hub === 'string' && typeof record.item === 'string' &&
        Array.isArray(record.required) && record.required.every((token: unknown) => typeof token === 'string')
        ? { ok: true } : { ok: false, detail: 'hub, item, and required must be valid' };
    } },
  },
);

const UntagItem = endpoint('/setup/items/untag', ({ hub, item }) =>
  receive({ hub, item }).then(
    where(ScopedDocument({ hub, item }))
      .then(RequirementTagging.untag({ item }))
      .then(respond({ item })).named('document-in-hub'),
    where(no(ScopedDocument({ hub, item })), ScopedBlock({ hub, item }))
      .then(RequirementTagging.untag({ item }))
      .then(respond({ item })).named('block-in-hub'),
    where(no(ScopedDocument({ hub, item })), no(ScopedBlock({ hub, item })))
      .then(respond({ error: 'ITEM_NOT_FOUND' })).named('item-missing'),
  ), { input: { required: ['hub', 'item'] } },
);

export const composition = {
  CreateDocument, TagItem, UntagItem,
  ExistingHub, ScopedDocument, ScopedBlock, AllowedRequirements, CreatedDocument,
};
