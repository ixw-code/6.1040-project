# Accounts

Accounts handles registration, login, sessions, and importing anonymous reader progress. Registering stores users and provider identities, while Sessioning manages authenticated sessions.

The HTTP boundary handles OAuth with Google and MIT SDG Commons, verifies provider identities, and manages cookies. Returning users are found through [provider lookup](view:Accounts.ProviderAccount) and [login](reaction:Accounts.Login) creates a new session. New users must choose a username through [register](reaction:Accounts.Register) before their account and session are created. Both operations import existing anonymous progress through ReaderProgress, retaining the anonymous cookie if import fails.

```endpoints
Accounts.Login at /accounts/login
Accounts.Register at /accounts/register
```

The [current account](reaction:Accounts.Current) is determined from the authenticated session, not a user ID supplied by the client. [Logout](reaction:Accounts.Logout) ends the session and clears its cookie. [ChangeUsername](reaction:Accounts.ChangeUsername) updates the username of the current user.

```endpoints
Accounts.Current at /accounts/current
Accounts.Logout at /accounts/logout
Accounts.ChangeUsername at /accounts/set-username
```

[DeleteAccount](reaction:Accounts.DeleteAccount) uses the current session to identify the user and ignores any supplied user ID. It refuses with `HUBS_OWNED` before making changes if that user owns a hub.

Otherwise, it ends the user's sessions, unregisters their provider identity, clears their reading progress, and deletes their uploaded media. Article records and media references remain; the reader shows its unavailable-media fallback when media is gone. Cleanup is serialized and recoverable: completed removals are skipped, media bytes are removed before metadata, and account or application operations wait for recovery. Success is returned only after cleanup completes; the provider identity can then be registered again.

```endpoints
Accounts.DeleteAccount at /accounts/delete
```

Sessions expire and are verified on authenticated requests. Session identifiers and OAuth credentials are not exposed through request bodies or logs.
