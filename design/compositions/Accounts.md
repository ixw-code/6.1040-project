# Accounts

Accounts coordinates registration, login, sessions, and anonymous-progress import. Registering owns users and provider identities; Sessioning owns authenticated sessions.

The HTTP boundary verifies Google or MIT SDG Commons identities and manages cookies. [Login](reaction:Accounts.Login) finds returning users through [provider lookup](view:Accounts.ProviderAccount) and starts a session. New users choose a username through [register](reaction:Accounts.Register), which creates the account and session. Both flows import anonymous progress through ReaderProgress; failed imports leave the anonymous cookie available for retry.

```endpoints
Accounts.Login at /accounts/login
Accounts.Register at /accounts/register
```

The [current account](reaction:Accounts.Current) comes from the authenticated session. [Logout](reaction:Accounts.Logout) ends that session and clears its cookie; [ChangeUsername](reaction:Accounts.ChangeUsername) updates the current user's name.

```endpoints
Accounts.Current at /accounts/current
Accounts.Logout at /accounts/logout
Accounts.ChangeUsername at /accounts/set-username
```

[DeleteAccount](reaction:Accounts.DeleteAccount) identifies the user from the session and refuses with `HUBS_OWNED` before mutation if they own a hub.

Otherwise, it ends their sessions, unregisters the provider identity, clears progress, and deletes uploaded media while leaving articles and references intact; unavailable media uses the reader fallback. Cleanup is serialized and recoverable: retries skip completed steps, remove media bytes before metadata, and block application requests until recovery. Success follows complete cleanup, after which the same provider identity can register again.

```endpoints
Accounts.DeleteAccount at /accounts/delete
```

Sessions expire and are checked on authenticated requests. Session secrets and OAuth credentials are never accepted in request bodies or exposed in logs.
