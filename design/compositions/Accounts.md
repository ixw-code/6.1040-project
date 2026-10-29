# Accounts

Accounts coordinates externally verified provider identity, explicit registration, authenticated sessions, and the login-time import of anonymous progress. Registering owns the provider association and username; Sessioning owns session validity. Neither concept stores anonymous progress or OAuth credentials.

The HTTP boundary initiates Google or MIT SDG Commons authorization, validates the callback, and exposes only a verified provider and subject to the [provider lookup](view:Accounts.ProviderAccount). A returning identity follows [login](reaction:Accounts.Login): resolve its User, start a fresh Sessioning session, rotate the authenticated cookie, and invoke ReaderProgress's import using the separately verified anonymous cookie. A new identity receives a short-lived, signed pending-registration cookie; no User or Session is created until [register](reaction:Accounts.Register) receives a valid username and the verified pending identity. Register then starts a session and imports progress. A provider callback cannot choose a User or username from request parameters. A successful import clears the anonymous cookie only after the authenticated session and import have succeeded. On failure, the authenticated account's existing progress is preserved and the anonymous cookie remains available for retry.

```endpoints
Accounts.Login at /accounts/login
Accounts.Register at /accounts/register
```

The [current-account endpoint](reaction:Accounts.Current) uses Sessioning.use on the session selected from the trusted HttpOnly cookie, then reads Registering._user. Missing, expired, or revoked sessions yield an unauthenticated result. The [logout endpoint](reaction:Accounts.Logout) ends the session and clears the cookie even when the session is already invalid. The [rename endpoint](reaction:Accounts.ChangeUsername) resolves the session User before Registering.update. No caller can supply the User to mutate.

```endpoints
Accounts.Current at /accounts/current
Accounts.Logout at /accounts/logout
Accounts.ChangeUsername at /accounts/set-username
```

The [delete-account endpoint](reaction:Accounts.DeleteAccount) refuses while the User owns a hub, article, or asset. Otherwise it calls Sessioning.endUser, clears that User's ProgressRecording records, and unregisters the User in one application-coordinated database transaction. It clears the browser session cookie after commit. This makes account deletion bounded without silently transferring ownership.

```endpoints
Accounts.DeleteAccount at /accounts/delete
```

Session cookie issuance, clearing, Secure/HttpOnly/SameSite attributes, callback verification, and pending-registration cookie integrity belong to the HTTP boundary. Session secrets are never accepted from request bodies. Sessioning persists only their verifier hashes; the assembly redacts session secrets and provider callback values from occurrence logs. Sessioning.use checks expiration on every authenticated request; cleanup of expired session rows is optional housekeeping and cannot extend validity. Repeated login rotates the session rather than reusing a browser-supplied identifier.
