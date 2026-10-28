# Sessioning

## Purpose

Maintain revocable, expiring authenticated sessions for registered users.

## Principle

After a user signs in, a newly issued session resolves to that user until it expires or is ended. An expired or ended session never resolves to a user.

## Types

```types
external User
  The registered identity represented by a session.

```

## State

```state
a set of Sessions with
  a user User
  an expiresAt DateTime
  a unique verifierHash String

Rule: Session identities are generated with cryptographic randomness and cannot be chosen by callers.
Rule: Each session expires seven days after start and cannot be renewed by use.
Rule: Only a cryptographic hash of each cookie bearer secret is persisted; the raw secret exists only while issued or verified.
Rule: Sessioning stores no provider credentials or anonymous progress.
```

## Actions

```actions
start(user: User): returns (session: Session, expiresAt: DateTime)
  where user is supplied
  then
    create a new Session for user expiring seven days after the server's current time and persist only the secret's verifier hash
    returns session, expiresAt

use(session: Session): returns (user: User)
  where the hash of the supplied session secret does not match a Session, was ended, or has expired at the server's current time
  then
    refuses SESSION_INVALID "The session is invalid or expired."
  where the hash of the supplied session secret matches an unexpired Session
  then
    bind user to the Session's user without extending expiration
    returns user

end(session: Session): returns (ended: Flag)
  where the hash of the supplied session secret matches a Session
  then
    remove session and set ended to true
    returns ended
  where no Session matches the hash of the supplied session secret
  then
    set ended to false
    returns ended

endUser(user: User): returns ()
  where Sessions belong to user
  then
    remove all Sessions for user
    returns
  where no Sessions belong to user
  then
    leave state unchanged
    returns
```

## Queries

```queries
_active(session: Session): optional (user: User, expiresAt: DateTime)
  answers the User and expiry only for a valid unexpired session secret
  answers no row for an unknown, ended, or expired session.
```

