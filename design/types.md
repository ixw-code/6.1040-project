# Wikiplotter Beta types and bindings

Registered users, authenticated sessions, and anonymous progress have separate identities and lifetimes. A User is the only identity stored in ProgressRecording. An anonymous reader's selections are a signed browser cookie map and are validated against current hub checkpoints on every use; they are not ProgressRecording records. The HTTP boundary verifies provider assertions and cookies before compositions consume them. Neither an HTTP request body nor an anonymous cookie may claim a registered User.

## Application identities

```types
concrete ContentItem
  A Documenting Document or Block identity used as a requirement-rule key. Their identity namespaces are disjoint.
```

## Concept instances

```instances
instantiate Registering

instantiate Sessioning with
  User is Registering.User

instantiate HubCataloguing with
  User is Registering.User

instantiate Documenting with
  Scope is HubCataloguing.Hub
  User is Registering.User

instantiate Checkpointing with
  Scope is HubCataloguing.Hub

instantiate ProgressRecording with
  Scope is HubCataloguing.Hub
  Reader is Registering.User
  Checkpoint is Checkpointing.Checkpoint

instantiate RequirementTagging with
  Item is ContentItem
  Token is Checkpointing.Checkpoint

instantiate MediaAssetManaging with
  User is Registering.User
```

Documenting alone owns document-to-hub membership. HubCataloguing owns hub creator and slug; Documenting owns article author and ordered blocks; MediaAssetManaging owns uploader and asset metadata; Registering owns provider-to-user mapping; Sessioning owns authenticated session validity. Compositions check ownership by joining those concept queries with a User resolved from `Sessioning.use`. Requirement rules bind document and block IDs to checkpoint IDs. Media blocks contain an asset ID, while the asset's storage key and bytes remain outside Documenting.
