# Hub Cataloguing

## Purpose

Establish named spaces that can be discovered and addressed by stable identity.

## Principle

A maintainer creates a named space and finds it in the directory. Renaming the space changes its displayed name while its identity remains usable. A second space cannot take a name already in use.

## Types

```types
```

## State

```state
a set of Hubs with
  a unique name String

Rule: Names are trimmed, case-sensitive, nonempty strings.
```

## Actions

```actions
create(name: String) : returns (hub: Hub)
  where name is blank after trimming
  then
    refuses HUB_NAME_REQUIRED "A hub name is required."
  where name is nonblank and another Hub has the trimmed name
  then
    refuses HUB_NAME_TAKEN "This hub name is already in use."
  where name is nonblank and no Hub has the trimmed name
  then
    add a new hub with the trimmed name
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
```

## Queries

```queries
_hub(name: String) : optional (hub: Hub)
  answers the Hub with name
  answers no row for an unknown hub

_hubs() : many (hub: Hub, name: String)
  answers set of hubs and their names 
  answers no row if no hubs exist
```
