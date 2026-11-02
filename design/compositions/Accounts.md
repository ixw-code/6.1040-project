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

Account deletion is not yet implemented. The endpoint returns `ACCOUNT_DELETION_UNAVAILABLE`.

```endpoints
Accounts.DeleteAccount at /accounts/delete
```

Sessions expire and are verified on authenticated requests. Session identifiers and OAuth credentials are not exposed through request bodies or logs.
