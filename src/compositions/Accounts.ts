import { endpoint, receive, respond } from '@mit-sdg/sync-engine/boundary';
import { no, view, where } from '@mit-sdg/sync-engine/language';
import { concepts } from '@/concepts.ts';

const { Registering, Sessioning } = concepts;

const ProviderAccount = view('registered provider account',
  ({ provider, providerSubject }, { user }) =>
    where(Registering._byProvider({ provider, providerSubject }).is({ user })),
).optional();

// These endpoints are local to the trusted HTTP boundary. Provider identities and
// session secrets never enter the public sync-engine HTTP adapter.
const Login = endpoint('/accounts/login',
  ({ provider, providerSubject, user, session, expiresAt }) =>
    receive({ provider, providerSubject }).then(
      where(ProviderAccount({ provider, providerSubject }).is({ user }))
        .then(Sessioning.start({ user }).responds({ session, expiresAt }))
        .then(respond({ user, session, expiresAt })).named('existing-account'),
      where(no(ProviderAccount({ provider, providerSubject })))
        .then(respond({ error: 'ACCOUNT_NOT_FOUND' })).named('new-identity'),
    ),
  { input: { required: ['provider', 'providerSubject'] } },
);

const Register = endpoint('/accounts/register',
  ({ username, provider, providerSubject, user, session, expiresAt }) =>
    receive({ username, provider, providerSubject })
      .then(Registering.register({ username, provider, providerSubject }).responds({ user }))
      .then(Sessioning.start({ user }).responds({ session, expiresAt }))
      .then(respond({ user, session, expiresAt })),
  { input: { required: ['username', 'provider', 'providerSubject'] } },
);

const Current = endpoint('/accounts/current',
  ({ session, user, username, provider }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ user }))
      .then(where(Registering._user({ user }).is({ username, provider }))
        .then(respond({ user, username, provider }))),
  { input: { required: ['session'] } },
);

const Logout = endpoint('/accounts/logout', ({ session, ended }) =>
  receive({ session })
    .then(Sessioning.end({ session }).responds({ ended }))
    .then(respond({ ended })),
  { input: { required: ['session'] } },
);

const ChangeUsername = endpoint('/accounts/set-username', ({ session, username, user }) =>
  receive({ session, username })
    .then(Sessioning.use({ session }).responds({ user }))
    .then(Registering.update({ user, username }).responds({ user }))
    .then(respond({ user, username })),
  { input: { required: ['session', 'username'] } },
);

export const composition = { Login, Register, Current, Logout, ChangeUsername, ProviderAccount };
