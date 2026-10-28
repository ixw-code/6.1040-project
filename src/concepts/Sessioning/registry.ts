import { registerConcept } from '@mit-sdg/sync-engine/assembly';
import spec from '@design/concepts/Sessioning.md' with { type: 'text' };
import { SessioningConcept, SessionInvalid } from './Sessioning.ts';

export const registration = registerConcept({
  class: SessioningConcept,
  spec,
  refusals: { SESSION_INVALID: SessionInvalid },
});
