# Registering

## Purpose

Maintain application user identities and their verified provider associations.

## Principle

A person whose provider identity has been verified registers a username. Later sign-ins resolve the same user through that provider identity, and changing the username preserves the user identity.

## Types

```types
Provider is GOOGLE or COMMONS
  A supported external identity provider.

opaque Subject
  A provider's stable, nonsecret subject identifier.
```

## State

```state
a set of Users with
  a unique username String
  a provider Provider
  a providerSubject Subject
  unique provider and providerSubject

Rule: Usernames are 3 to 20 ASCII alphanumeric characters and compare exactly, including case.
Rule: A provider identity is associated with at most one User.
Rule: Registering stores no passwords, OAuth credentials, or provider tokens.
```

## Actions

```actions
register(username: String, provider: Provider, providerSubject: Subject): returns (user: User)
  where username is invalid
  then
    refuses INVALID_USERNAME "Use 3 to 20 letters or digits."
  where username is already used
  then
    refuses USERNAME_TAKEN "This username is already registered."
  where provider and providerSubject already identify a User
  then
    refuses PROVIDER_IDENTITY_TAKEN "This provider identity is already registered."
  where username and provider identity are valid and unused
  then
    create a User with the supplied association
    returns user

update(user: User, username: String): returns (user: User)
  where user does not exist
  then
    refuses USER_NOT_FOUND "There is no such user."
  where username is invalid
  then
    refuses INVALID_USERNAME "Use 3 to 20 letters or digits."
  where another User uses username
  then
    refuses USERNAME_TAKEN "This username is already registered."
  where user exists and username is valid and available
  then
    replace only the User's username
    returns user

unregister(user: User): returns (user: User)
  where user does not exist
  then
    refuses USER_NOT_FOUND "There is no such user."
  where user exists
  then
    remove the User
    returns user
```

## Queries

```queries
_user(user: User): optional (username: String, provider: Provider, providerSubject: Subject)
  answers the User's current public name and provider association
  answers no row for an unknown User.

_byProvider(provider: Provider, providerSubject: Subject): optional (user: User)
  answers the User associated with the verified provider identity
  answers no row if that provider identity is not registered.
```
