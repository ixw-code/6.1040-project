# Wikiplotter Alpha Types

Readers can browse through catalogued hubs, record their reading progress based on a hub's checkpoints, and view articles and passages that are safe for them to read. 

The bindings support the following design choices:

- Readers and contributors are wiki users. 
- Every document belongs to a hub.
- Checkpoints are organized within hubs.
- Reader's progress is recorded separately per hub. 
- Progress belongs to a reader identity (an application-defined identity for Alpha).
- Progress is defined by checkpoints organized per hub.
- Requirements can be applied to whole documents or individual blocks. 
- Requirements are defined by the same checkpoints used in reader progress. 

## Application identities

```types
concrete Reader
    An application-defined dummy reader identity retained by the browser.
    It identifies progress records and does not assert authentication.

concrete Contributor 
    An authenticated user, not disjoint with set of Readers,
    Not yet implemented.

concrete ContentItem
    A document or block identity owned by Documenting, supplied by a contributor.
    Document and block identities occupy disjoint namespaces.
```

## Concept instances

```instances
instantiate HubCataloguing

instantiate Documenting with
  Scope is HubCataloguing.Hub

instantiate Checkpointing with
  Scope is HubCataloguing.Hub

instantiate ProgressRecording with
  Scope is HubCataloguing.Hub
  Reader is Reader
  Checkpoint is Checkpointing.Checkpoint

instantiate RequirementTagging with
  Item is ContentItem
  Token is Checkpointing.Checkpoint
```
