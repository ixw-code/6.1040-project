import { endpoint, receive, respond } from '@mit-sdg/sync-engine/boundary';
import { each, former, no, view, where } from '@mit-sdg/sync-engine/language';
import { concepts } from '@/assembly/concepts.ts';

const { Sessioning, HubCataloguing, Checkpointing } = concepts;

const ExistingHub = view('hubs existing hub', ({ hub }) =>
  where(HubCataloguing._get({ hub })),
).holds();

const IsCreator = view('hubs creator', ({ hub, user }) =>
  where(HubCataloguing._get({ hub }).is({ creator: user })),
).holds();

const HubSequence = view('hubs sequence', ({ hub }, { sequence }) =>
  where(ExistingHub({ hub }), Checkpointing._sequences({ scope: hub }).is({ sequence })),
).optional();

const HubCheckpoint = view('hubs checkpoint', ({ hub, checkpoint }, _output, { sequence }) =>
  where(HubSequence({ hub }).is({ sequence }),
    Checkpointing._checkpoints({ scope: hub, sequence }).is({ checkpoint })),
).holds();

const SequenceList = former('hubs sequence list', ({ hub }, { sequence }) =>
  each(Checkpointing._sequences({ scope: hub }).is({ sequence })).form({ sequence: sequence! }),
);

const CheckpointChoices = former('hubs checkpoint choices', ({ hub, sequence }, { checkpoint, label, position }) =>
  each(Checkpointing._checkpoints({ scope: hub, sequence }).is({ checkpoint, label, position }))
    .form({ checkpoint: checkpoint!, label: label!, position: position! }),
);

const CreateHub = endpoint('/hubs/create', ({ session, user, name, label, hub, sequence, checkpoint }) =>
  receive({ session, name, label })
    .then(Sessioning.use({ session }).responds({ user }))
    .then(HubCataloguing.create({ name, creator: user }).responds({ hub }))
    .then(Checkpointing.create({ scope: hub, label }).responds({ sequence }))
    .then(Checkpointing.append({ sequence, label }).responds({ checkpoint }))
    .then(respond({ hub, sequence })),
  { input: { required: ['session', 'name', 'label'] } },
);

const RenameHub = endpoint('/hubs/rename', ({ session, user, hub, name }) =>
  receive({ session, hub, name })
    .then(Sessioning.use({ session }).responds({ user }))
    .then(
      where(IsCreator({ hub, user })).then(HubCataloguing.rename({ hub, name }).responds({ hub }))
        .then(respond({ hub })).named('creator'),
      where(no(IsCreator({ hub, user }))).then(respond({ error: 'FORBIDDEN' })).named('not-creator'),
    ),
  { input: { required: ['session', 'hub', 'name'] } },
);

const UpdateSlug = endpoint('/hubs/slug', ({ session, user, hub, slug }) =>
  receive({ session, hub, slug })
    .then(Sessioning.use({ session }).responds({ user }))
    .then(
      where(IsCreator({ hub, user })).then(HubCataloguing.updateSlug({ hub, slug }).responds({ slug }))
        .then(respond({ slug })).named('creator'),
      where(no(IsCreator({ hub, user }))).then(respond({ error: 'FORBIDDEN' })).named('not-creator'),
    ),
  { input: { required: ['session', 'hub', 'slug'] } },
);

const GetHubAccess = endpoint('/hubs/access', ({ session, user, hub }) =>
  receive({ session, hub })
    .then(Sessioning.use({ session }).responds({ user }))
    .then(
      where(IsCreator({ hub, user })).then(respond({ canManage: true })).named('creator'),
      where(no(IsCreator({ hub, user }))).then(respond({ canManage: false })).named('not-creator'),
    ),
  { input: { required: ['session', 'hub'] } },
);

const GetSequences = endpoint('/hubs/sequences', ({ hub }) =>
  receive({ hub }).then(
    where(ExistingHub({ hub })).then(respond({ sequences: SequenceList({ hub }) })).named('existing-hub'),
    where(no(ExistingHub({ hub }))).then(respond({ error: 'HUB_NOT_FOUND' })).named('missing-hub'),
  ), { input: { required: ['hub'] } },
);

const ListCheckpoints = endpoint('/checkpoints/list', ({ hub, sequence }) =>
  receive({ hub }).then(
    where(HubSequence({ hub }).is({ sequence }))
      .then(respond({ sequence, checkpoints: CheckpointChoices({ hub, sequence }) })).named('existing-sequence'),
    where(no(HubSequence({ hub })))
      .then(respond({ error: 'SEQUENCE_NOT_FOUND' })).named('missing-sequence'),
  ), { input: { required: ['hub'] } },
);

const AppendCheckpoint = endpoint('/checkpoints/append', ({ session, user, hub, sequence, label, checkpoint }) =>
  receive({ session, hub, sequence, label })
    .then(Sessioning.use({ session }).responds({ user }))
    .then(
      where(IsCreator({ hub, user }), HubSequence({ hub }).is({ sequence }))
        .then(Checkpointing.append({ sequence, label }).responds({ checkpoint }))
        .then(respond({ checkpoint })).named('creator-sequence'),
      where(no(IsCreator({ hub, user }))).then(respond({ error: 'FORBIDDEN' })).named('not-creator'),
      where(IsCreator({ hub, user }), no(HubSequence({ hub }).is({ sequence })))
        .then(respond({ error: 'SEQUENCE_NOT_FOUND' })).named('foreign-sequence'),
    ),
  { input: { required: ['session', 'hub', 'sequence', 'label'] } },
);

const RelabelCheckpoint = endpoint('/checkpoints/relabel', ({ session, user, hub, checkpoint, label }) =>
  receive({ session, hub, checkpoint, label })
    .then(Sessioning.use({ session }).responds({ user }))
    .then(
      where(IsCreator({ hub, user }), HubCheckpoint({ hub, checkpoint }))
        .then(Checkpointing.relabel({ scope: hub, checkpoint, label }).responds({ checkpoint }))
        .then(respond({ checkpoint })).named('creator-checkpoint'),
      where(no(IsCreator({ hub, user }))).then(respond({ error: 'FORBIDDEN' })).named('not-creator'),
      where(IsCreator({ hub, user }), no(HubCheckpoint({ hub, checkpoint })))
        .then(respond({ error: 'CHECKPOINT_NOT_FOUND' })).named('foreign-checkpoint'),
    ),
  { input: { required: ['session', 'hub', 'checkpoint', 'label'] } },
);

export const composition = {
  CreateHub, RenameHub, UpdateSlug, GetHubAccess, GetSequences, ListCheckpoints, AppendCheckpoint, RelabelCheckpoint,
  ExistingHub, IsCreator, HubSequence, HubCheckpoint, SequenceList, CheckpointChoices,
};
