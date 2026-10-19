import { endpoint, receive, respond } from '@mit-sdg/sync-engine/boundary';
import { each, former, no, view, where } from '@mit-sdg/sync-engine/language';
import { concepts } from '@/concepts.ts';

const { HubCataloguing, Checkpointing, ProgressRecording } = concepts;

const ExistingHub = view('reader progress hub', ({ hub }) =>
  where(HubCataloguing._hubs({}).is({ hub })),
).holds();

const ValidSelection = view('reader progress selection', ({ hub, checkpoint }, _output, { sequence }) =>
  where(
    ExistingHub({ hub }),
    Checkpointing._sequences({ scope: hub }).is({ sequence }),
    Checkpointing._checkpoints({ scope: hub, sequence }).is({ checkpoint }),
  ),
).holds();

const StoredProgress = view('stored reader progress', ({ hub, reader }, { checkpoint }) =>
  where(ProgressRecording._checkpoint({ scope: hub, reader }).is({ checkpoint })),
).many();

const ProgressResult = former('reader progress result', ({ hub, reader }, { checkpoint }) =>
  each(StoredProgress({ hub, reader }).is({ checkpoint })).first(checkpoint!),
);

const validInput = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false as const, detail: 'hub, reader, and checkpoint must be nonblank strings' };
  }
  const input = value as Record<string, unknown>;
  return typeof input.hub === 'string' && !!input.hub.trim() &&
    typeof input.reader === 'string' && !!input.reader.trim() &&
    (!('checkpoint' in input) || (typeof input.checkpoint === 'string' && !!input.checkpoint.trim()))
    ? { ok: true as const } : { ok: false as const, detail: 'hub, reader, and checkpoint must be nonblank strings' };
};

const GetProgress = endpoint('/progress/get', ({ hub, reader }) =>
  receive({ hub, reader }).then(
    where(ExistingHub({ hub })).then(respond({ checkpoint: ProgressResult({ hub, reader }) })).named('hub-exists'),
    where(no(ExistingHub({ hub }))).then(respond({ error: 'HUB_NOT_FOUND' })).named('hub-missing'),
  ), { input: { required: ['hub', 'reader'] }, validators: { input: validInput } },
);

const RecordProgress = endpoint('/progress/record', ({ hub, reader, checkpoint }) =>
  receive({ hub, reader, checkpoint }).then(
    where(ValidSelection({ hub, checkpoint }))
      .then(ProgressRecording.record({ scope: hub, reader, checkpoint }))
      .then(respond({ checkpoint })).named('valid-selection'),
    where(no(ExistingHub({ hub })))
      .then(respond({ error: 'HUB_NOT_FOUND' })).named('hub-missing'),
    where(ExistingHub({ hub }), no(ValidSelection({ hub, checkpoint })))
      .then(respond({ error: 'CHECKPOINT_NOT_FOUND' })).named('checkpoint-missing'),
  ), { input: { required: ['hub', 'reader', 'checkpoint'] }, validators: { input: validInput } },
);

const ClearProgress = endpoint('/progress/clear', ({ hub, reader, cleared }) =>
  receive({ hub, reader }).then(
    where(ExistingHub({ hub }))
      .then(ProgressRecording.clear({ scope: hub, reader }).responds({ cleared }))
      .then(respond({ cleared })).named('hub-exists'),
    where(no(ExistingHub({ hub })))
      .then(respond({ error: 'HUB_NOT_FOUND' })).named('hub-missing'),
  ), { input: { required: ['hub', 'reader'] }, validators: { input: validInput } },
);

export const composition = { GetProgress, RecordProgress, ClearProgress, ExistingHub, ValidSelection, StoredProgress, ProgressResult };
