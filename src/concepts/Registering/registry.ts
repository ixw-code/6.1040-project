import { registerConcept } from '@mit-sdg/sync-engine/assembly';
import spec from '@design/concepts/Registering.md' with { type: 'text' };
import {
  RegisteringConcept, InvalidUsername, UsernameTaken, ProviderIdentityTaken, UserNotFound,
} from './Registering.ts';

export const registration = registerConcept({
  class: RegisteringConcept,
  spec,
  refusals: {
    INVALID_USERNAME: InvalidUsername,
    USERNAME_TAKEN: UsernameTaken,
    PROVIDER_IDENTITY_TAKEN: ProviderIdentityTaken,
    USER_NOT_FOUND: UserNotFound,
  },
});
