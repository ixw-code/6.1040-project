import { endpoint, receive, respond } from '@mit-sdg/sync-engine/boundary';
import { each, former, no, view, where } from '@mit-sdg/sync-engine/language';
import { concepts } from '@/assembly/concepts.ts';

const { HubCataloguing, Checkpointing } = concepts;

const ExistingHub = view('existing hub', ({ hub }) =>
  where(HubCataloguing._hubs({}).is({ hub })),
).holds();

const HubSequence = view('hub sequence', ({ hub }, { sequence }) =>
  where(ExistingHub({ hub }), Checkpointing._sequences({ scope: hub }).is({ sequence })),
).optional();

const HubCheckpoint = view('hub checkpoint', ({ hub, checkpoint }, _output, { sequence }) =>
  where(
    HubSequence({ hub }).is({ sequence }),
    Checkpointing._checkpoints({ scope: hub, sequence }).is({ checkpoint }),
  ),
).holds();

const SequenceList = former('sequence list', ({ hub }, { sequence }) =>
  each(Checkpointing._sequences({ scope: hub }).is({ sequence })).form({ sequence: sequence! }),
);

const CheckpointChoices = former(
  'checkpoint choices',
  ({ hub, sequence }, { checkpoint, label, position }) =>
    each(Checkpointing._checkpoints({ scope: hub, sequence }).is({
      checkpoint, label, position,
    })).form({ checkpoint: checkpoint!, label: label!, position: position! }),
);

const CreateHub = endpoint(
  '/hubs/create',
  ({ name, label, hub, sequence, checkpoint }) =>
    receive({ name, label })
      .then(HubCataloguing.create({ name, creator: 'legacy-setup' }).responds({ hub }))
      .then(Checkpointing.create({ scope: hub, label }).responds({ sequence }))
      .then(Checkpointing.append({ sequence, label }).responds({ checkpoint }))
      .then(respond({ hub, sequence })),
  {
    input: { required: ['name', 'label'] },
    validators: { input: (value) => {
      const record = value as Record<string, unknown>;
      return typeof record.name === 'string' && !!record.name.trim() &&
        typeof record.label === 'string' && !!record.label.trim()
        ? { ok: true } : { ok: false, detail: 'name and label must be nonblank strings' };
    } },
  },
);

const RenameHub = endpoint('/hubs/rename', ({ hub, name }) =>
  receive({ hub, name })
    .then(HubCataloguing.rename({ hub, name }).responds({ hub }))
    .then(respond({ hub })),
  { input: { required: ['hub', 'name'] } },
);

const GetSequences = endpoint('/hubs/sequences', ({ hub }) =>
  receive({ hub }).then(
    where(ExistingHub({ hub })).then(respond({ sequences: SequenceList({ hub }) })).named('hub-exists'),
    where(no(ExistingHub({ hub }))).then(respond({ error: 'HUB_NOT_FOUND' })).named('hub-missing'),
  ),
  { input: { required: ['hub'] } },
);

const ListCheckpoints = endpoint('/checkpoints/list', ({ hub, sequence }) =>
  receive({ hub }).then(
    where(HubSequence({ hub }).is({ sequence }))
      .then(respond({ sequence, checkpoints: CheckpointChoices({ hub, sequence }) })).named('sequence-exists'),
    where(no(HubSequence({ hub })))
      .then(respond({ error: 'SEQUENCE_NOT_FOUND' })).named('sequence-missing'),
  ),
  { input: { required: ['hub'] } },
);

const AppendCheckpoint = endpoint('/checkpoints/append', ({ hub, sequence, label, checkpoint }) =>
  receive({ hub, sequence, label }).then(
    where(HubSequence({ hub }).is({ sequence }))
      .then(Checkpointing.append({ sequence, label }).responds({ checkpoint }))
      .then(respond({ checkpoint })).named('sequence-belongs-to-hub'),
    where(no(HubSequence({ hub }).is({ sequence })))
      .then(respond({ error: 'SEQUENCE_NOT_FOUND' })).named('foreign-sequence'),
  ),
  { input: { required: ['hub', 'sequence', 'label'] } },
);

const RelabelCheckpoint = endpoint('/checkpoints/relabel', ({ hub, checkpoint, label }) =>
  receive({ hub, checkpoint, label }).then(
    where(HubCheckpoint({ hub, checkpoint }))
      .then(Checkpointing.relabel({ scope: hub, checkpoint, label }).responds({ checkpoint }))
      .then(respond({ checkpoint })).named('checkpoint-belongs-to-hub'),
    where(no(HubCheckpoint({ hub, checkpoint })))
      .then(respond({ error: 'CHECKPOINT_NOT_FOUND' })).named('foreign-checkpoint'),
  ),
  { input: { required: ['hub', 'checkpoint', 'label'] } },
);

export const composition = {
  CreateHub, RenameHub, GetSequences, ListCheckpoints, AppendCheckpoint, RelabelCheckpoint,
  ExistingHub, HubSequence, HubCheckpoint, SequenceList, CheckpointChoices,
};
