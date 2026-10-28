# HubCataloguing

## Purpose

Establish named spaces that can be discovered and addressed by stable identity.

## Principle

A maintainer creates a named space and finds it in the directory. Renaming the space changes its displayed name while its identity remains usable. A second space cannot take a name already in use.

## Types

```types
external User
  The registered creator of a hub.

```

## State

```state
a set of Hubs with
  a unique name String
  a creator User
  a unique slug String

Rule: Names are trimmed, case-sensitive, nonempty strings.
Rule: Slugs are lowercase ASCII letters, digits, and internal hyphens, are 3 to 80 characters, and are unique.
Rule: A new hub's slug lowercases the trimmed name, replaces runs of non-ASCII-alphanumeric characters with one hyphen, trims edge hyphens, and must then be 3 to 80 characters; renaming never changes the slug.
```

## Actions

```actions
create(name: String, creator: User) : returns (hub: Hub)
  where name is blank after trimming
  then
    refuses HUB_NAME_REQUIRED "A hub name is required."
  where name is nonblank and another Hub has the trimmed name
  then
    refuses HUB_NAME_TAKEN "This hub name is already in use."
  where name does not produce a valid slug
  then
    refuses INVALID_HUB_SLUG "The hub name cannot produce a valid URL slug."
  where the derived slug is already used
  then
    refuses HUB_SLUG_TAKEN "This hub URL is already used."
  where name and derived slug are valid and unused
  then
    add a new hub with the trimmed name, slug, and creator
    returns hub

rename(hub: Hub, name: String) : returns (hub: Hub)
  where hub not in Hubs
  then
    refuses HUB_NOT_FOUND "There is no such hub."
  where hub in Hubs and name is blank after trimming
  then
    refuses HUB_RENAME_NAME_REQUIRED "A replacement hub name is required."
  where hub in Hubs and another Hub has the nonblank trimmed name
  then
    refuses HUB_RENAME_NAME_TAKEN "Another hub already uses this name."
  where hub is in Hubs and the nonblank trimmed name is unused by other Hubs
  then
    update hub's name to the trimmed name
    returns hub

updateSlug(hub: Hub, slug: String): returns (slug: String)
  where hub does not exist
  then
    refuses HUB_NOT_FOUND "There is no such hub."
  where slug is not a valid lowercase URL slug
  then
    refuses INVALID_HUB_SLUG "Use a valid URL slug."
  where another Hub uses slug
  then
    refuses HUB_SLUG_TAKEN "This hub URL is already used."
  where hub exists and slug is valid and available
  then
    replace only hub's slug
    returns slug

delete(hub: Hub): returns (hub: Hub)
  where hub does not exist
  then
    refuses HUB_NOT_FOUND "There is no such hub."
  where hub exists
  then
    remove the hub
    returns hub
```

## Queries

```queries
_hub(name: String) : optional (hub: Hub)
  answers the Hub with name
  answers no row for an unknown hub.

_hubs() : many (hub: Hub, name: String)
  answers hubs and their names in hub identity order
  answers no rows if no hubs exist.

_bySlug(slug: String): optional (hub: Hub)
  answers the Hub with the slug
  answers no row for an unknown hub.

_get(hub: Hub): optional (name: String, slug: String, creator: User)
  answers hub metadata for ownership checks
  answers no row for an unknown hub.

_createdBy(creator: User): many (hub: Hub)
  answers hubs created by the User
  orders rows by hub identity
  answers no rows when none exist.
```
