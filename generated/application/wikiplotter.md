<!-- Generated from the Wikiplotter assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Wikiplotter — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Checkpointing

Defined in [Checkpointing](../../design/concepts/Checkpointing.md), line 1.

#### Actions

- `create(scope: Scope, label: String) : returns (sequence: Sequence)`
- `append(sequence: Sequence, label: String) : returns (checkpoint: Checkpoint)`
  - Refuses `SEQUENCE_NOT_FOUND`: There is no such checkpoint sequence.
  - Refuses `CHECKPOINT_LABEL_REQUIRED`: A checkpoint label is required.
- `relabel(scope: Scope, checkpoint: Checkpoint, label: String) : returns (checkpoint: Checkpoint)`
  - Refuses `CHECKPOINT_NOT_FOUND`: This checkpoint does not belong to the scope.
  - Refuses `START_LABEL_FIXED`: The NotStarted checkpoint cannot be relabelled.
  - Refuses `CHECKPOINT_RENAME_LABEL_REQUIRED`: A replacement checkpoint label is required.
- `delete(scope: Scope, sequence: Sequence) : returns (sequence: Sequence)`
  - Refuses `SEQUENCE_NOT_FOUND`: There is no such checkpoint sequence.

#### Queries

- `_sequences(scope: Scope) : many (sequence: Sequence)`
- `_checkpoints(scope: Scope, sequence: Sequence) : many (checkpoint: Checkpoint, label: String, position: Number)`
- `_prefix(scope: Scope, sequence: Sequence, checkpoint: Checkpoint) : many (checkpoint: Checkpoint)`
- `_prefixTokens(scope: Scope, sequence: Sequence, checkpoint: Checkpoint) : optional (tokens: TokenSet)`
- `_contains(scope: Scope, sequence: Sequence, tokens: TokenSet) : one (valid: Flag)`

#### Instances

- `Checkpointing` — instance of `Checkpointing` — [Wikiplotter Beta types and bindings](../../design/types.md), line 27.
  - `Scope` is `HubCataloguing.Hub` — [Wikiplotter Beta types and bindings](../../design/types.md), line 28.

### Documenting

Defined in [Documenting](../../design/concepts/Documenting.md), line 1.

#### Actions

- `create(scope: Scope, author: User, title: String, blocks: BlockInputs) : returns (document: Document)`
  - Refuses `DOCUMENT_TITLE_REQUIRED`: A document title is required.
  - Refuses `DOCUMENT_TITLE_TAKEN`: This document title is already used in the scope.
  - Refuses `INVALID_DOCUMENT_BLOCKS`: Provide valid text, image, or video blocks.
- `update(scope: Scope, document: Document, blocks: BlockInputs) : returns (document: Document, blocks: BlockInputs)`
  - Refuses `DOCUMENT_NOT_FOUND`: There is no such document in the scope.
  - Refuses `INVALID_DOCUMENT_BLOCKS`: Provide valid text, image, or video blocks.
- `rename(scope: Scope, document: Document, title: String) : returns (title: String)`
  - Refuses `DOCUMENT_NOT_FOUND`: There is no such document in the scope.
  - Refuses `DOCUMENT_TITLE_REQUIRED`: A document title is required.
  - Refuses `DOCUMENT_TITLE_TAKEN`: This document title is already used in the scope.
- `delete(scope: Scope, document: Document) : returns (document: Document)`
  - Refuses `DOCUMENT_NOT_FOUND`: There is no such document in the scope.

#### Queries

- `_documents(scope: Scope) : many (document: Document)`
- `_title(scope: Scope, document: Document) : optional (title: String)`
- `_blocks(scope: Scope, document: Document) : many (block: Block, kind: BlockType, body: Content, alt: String)`
- `_documentForEditing(scope: Scope, document: Document) : optional (title: String, author: User, blocks: BlockInputs)`
- `_authoredBy(author: User) : many (scope: Scope, document: Document)`

#### Instances

- `Documenting` — instance of `Documenting` — [Wikiplotter Beta types and bindings](../../design/types.md), line 23.
  - `Scope` is `HubCataloguing.Hub` — [Wikiplotter Beta types and bindings](../../design/types.md), line 24.
  - `User` is `Registering.User` — [Wikiplotter Beta types and bindings](../../design/types.md), line 25.

### HubCataloguing

Defined in [HubCataloguing](../../design/concepts/HubCataloguing.md), line 1.

#### Actions

- `create(name: String, creator: User) : returns (hub: Hub)`
  - Refuses `HUB_NAME_REQUIRED`: A hub name is required.
  - Refuses `HUB_NAME_TAKEN`: This hub name is already in use.
  - Refuses `INVALID_HUB_SLUG`: The hub name cannot produce a valid URL slug.
  - Refuses `HUB_SLUG_TAKEN`: This hub URL is already used.
- `rename(hub: Hub, name: String) : returns (hub: Hub)`
  - Refuses `HUB_NOT_FOUND`: There is no such hub.
  - Refuses `HUB_RENAME_NAME_REQUIRED`: A replacement hub name is required.
  - Refuses `HUB_RENAME_NAME_TAKEN`: Another hub already uses this name.
- `updateSlug(hub: Hub, slug: String) : returns (slug: String)`
  - Refuses `HUB_NOT_FOUND`: There is no such hub.
  - Refuses `INVALID_HUB_SLUG`: Use a valid URL slug.
  - Refuses `HUB_SLUG_TAKEN`: This hub URL is already used.
- `delete(hub: Hub) : returns (hub: Hub)`
  - Refuses `HUB_NOT_FOUND`: There is no such hub.

#### Queries

- `_hub(name: String) : optional (hub: Hub)`
- `_hubs() : many (hub: Hub, name: String)`
- `_bySlug(slug: String) : optional (hub: Hub)`
- `_get(hub: Hub) : optional (name: String, slug: String, creator: User)`
- `_createdBy(creator: User) : many (hub: Hub)`

#### Instances

- `HubCataloguing` — instance of `HubCataloguing` — [Wikiplotter Beta types and bindings](../../design/types.md), line 20.
  - `User` is `Registering.User` — [Wikiplotter Beta types and bindings](../../design/types.md), line 21.

### MediaAssetManaging

Defined in [MediaAssetManaging](../../design/concepts/MediaAssetManaging.md), line 1.

#### Actions

- `create(uploader: User, filename: String, storageKey: StorageKey, kind: AssetType) : returns (asset: Asset)`
  - Refuses `INVALID_ASSET`: Provide a filename and supported media kind.
  - Refuses `STORAGE_KEY_TAKEN`: The storage key is already registered.
  - Refuses `ASSET_FILENAME_TAKEN`: You already have an asset with this filename.
- `finalize(asset: Asset) : returns (asset: Asset)`
  - Refuses `ASSET_NOT_FOUND`: There is no such asset.
- `confirmReadyReference(asset: Asset, kind: AssetType) : returns (asset: Asset)`
  - Refuses `ASSET_NOT_READY`: This media asset is unavailable for the requested kind.
- `delete(asset: Asset) : returns (asset: Asset)`
  - Refuses `ASSET_NOT_FOUND`: There is no such asset.

#### Queries

- `_get(asset: Asset) : optional (uploader: User, filename: String, storageKey: StorageKey, kind: AssetType, status: AssetStatus)`
- `_uploadedBy(uploader: User) : many (asset: Asset, filename: String, kind: AssetType, status: AssetStatus)`

#### Instances

- `MediaAssetManaging` — instance of `MediaAssetManaging` — [Wikiplotter Beta types and bindings](../../design/types.md), line 39.
  - `User` is `Registering.User` — [Wikiplotter Beta types and bindings](../../design/types.md), line 40.

### ProgressRecording

Defined in [ProgressRecording](../../design/concepts/ProgressRecording.md), line 1.

#### Actions

- `record(scope: Scope, reader: Reader, checkpoint: Checkpoint) : returns ()`
- `recordIfAbsent(scope: Scope, reader: Reader, checkpoint: Checkpoint) : returns (recorded: Flag)`
- `clear(scope: Scope, reader: Reader) : returns (cleared: Flag)`
- `clearScope(scope: Scope) : returns ()`

#### Queries

- `_checkpoint(scope: Scope, reader: Reader) : optional (checkpoint: Checkpoint)`
- `_scopesForReader(reader: Reader) : many (scope: Scope)`

#### Instances

- `ProgressRecording` — instance of `ProgressRecording` — [Wikiplotter Beta types and bindings](../../design/types.md), line 30.
  - `Checkpoint` is `Checkpointing.Checkpoint` — [Wikiplotter Beta types and bindings](../../design/types.md), line 33.
  - `Reader` is `Registering.User` — [Wikiplotter Beta types and bindings](../../design/types.md), line 32.
  - `Scope` is `HubCataloguing.Hub` — [Wikiplotter Beta types and bindings](../../design/types.md), line 31.

### Registering

Defined in [Registering](../../design/concepts/Registering.md), line 1.

#### Actions

- `register(username: String, provider: Provider, providerSubject: Subject) : returns (user: User)`
  - Refuses `INVALID_USERNAME`: Use 3 to 20 letters or digits.
  - Refuses `USERNAME_TAKEN`: This username is already registered.
  - Refuses `PROVIDER_IDENTITY_TAKEN`: This provider identity is already registered.
- `update(user: User, username: String) : returns (user: User)`
  - Refuses `USER_NOT_FOUND`: There is no such user.
  - Refuses `INVALID_USERNAME`: Use 3 to 20 letters or digits.
  - Refuses `USERNAME_TAKEN`: This username is already registered.
- `unregister(user: User) : returns (user: User)`
  - Refuses `USER_NOT_FOUND`: There is no such user.

#### Queries

- `_user(user: User) : optional (username: String, provider: Provider, providerSubject: Subject)`
- `_byProvider(provider: Provider, providerSubject: Subject) : optional (user: User)`

#### Instances

- `Registering` — instance of `Registering` — [Wikiplotter Beta types and bindings](../../design/types.md), line 15.

### RequirementTagging

Defined in [RequirementTagging](../../design/concepts/RequirementTagging.md), line 1.

#### Actions

- `tag(item: Item, required: TokenSet) : returns ()`
- `untag(item: Item) : returns ()`
  - Refuses `REQUIREMENT_RULE_NOT_FOUND`: This item has no requirement rule.

#### Queries

- `_rule(item: Item) : optional (required: TokenSet)`
- `_eligible(item: Item, tokens: TokenSet) : one (eligible: Flag)`
- `_rulesForItems(items: ItemSet) : many (item: Item, required: TokenSet)`
- `_itemsRequiringToken(token: Token) : many (item: Item)`

#### Instances

- `RequirementTagging` — instance of `RequirementTagging` — [Wikiplotter Beta types and bindings](../../design/types.md), line 35.
  - `Item` is `ContentItem` — [Wikiplotter Beta types and bindings](../../design/types.md), line 36.
  - `Token` is `Checkpointing.Checkpoint` — [Wikiplotter Beta types and bindings](../../design/types.md), line 37.

### Sessioning

Defined in [Sessioning](../../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(user: User) : returns (session: Session, expiresAt: DateTime)`
- `use(session: Session) : returns (user: User)`
  - Refuses `SESSION_INVALID`: The session is invalid or expired.
- `end(session: Session) : returns (ended: Flag)`
- `endUser(user: User) : returns ()`

#### Queries

- `_active(session: Session) : optional (user: User, expiresAt: DateTime)`

#### Instances

- `Sessioning` — instance of `Sessioning` — [Wikiplotter Beta types and bindings](../../design/types.md), line 17.
  - `User` is `Registering.User` — [Wikiplotter Beta types and bindings](../../design/types.md), line 18.

## Application types

Concrete types:

- `ContentItem` — [Wikiplotter Beta types and bindings](../../design/types.md), line 8.

## Views

_Views name reusable conditions. Multiple `where` blocks are alternatives._

### eligible block

Authored path: `Reading.EligibleBlock`.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.

```view
eligible block — inputs (hub, document, tokens); outputs (block, kind, body, alt); bindings () — answers any number of (block, kind, body, alt)
  where
    Documenting._blocks (document, scope: hub) has (alt, block, body, kind)
    RequirementTagging._eligible (item: block, tokens) has (eligible: true)
```

### readable document

Authored path: `Reading.ReadableArticle`.
- Covered by [Reading](../../design/compositions/Reading.md), line 11.

```view
readable document — inputs (hub, tokens); outputs (document); bindings () — answers any number of (document)
  where
    Documenting._documents (scope: hub) has (document)
    RequirementTagging._eligible (item: document, tokens) has (eligible: true)
```

### reader progress hub

Authored path: `ReaderProgress.ExistingHub`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 5.

```view
reader progress hub — inputs (hub); outputs (); bindings ()
  where HubCataloguing._hubs () has (hub)
```

### reader progress selection

Authored path: `ReaderProgress.ValidSelection`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 5.

```view
reader progress selection — inputs (hub, checkpoint); outputs (); bindings (sequence)
  where
    view "reader progress hub" with (hub)
    Checkpointing._sequences (scope: hub) has (sequence)
    Checkpointing._checkpoints (scope: hub, sequence) has (checkpoint)
```

### reading hub

Authored path: `Reading.ExistingHub`.
- Covered by [Reading](../../design/compositions/Reading.md), line 5.

```view
reading hub — inputs (hub); outputs (); bindings ()
  where HubCataloguing._hubs () has (hub)
```

### reading selection

Authored path: `Reading.ReaderSelection`.
- Covered by [Reading](../../design/compositions/Reading.md), line 3.

```view
reading selection — inputs (hub, reader); outputs (tokens); bindings (sequence, checkpoint) — answers at most one (tokens)
  where
    view "reading hub" with (hub)
    Checkpointing._sequences (scope: hub) has (sequence)
    ProgressRecording._checkpoint (reader, scope: hub) has (checkpoint)
    Checkpointing._prefixTokens (checkpoint, scope: hub, sequence) has (tokens)
```

### stored reader progress

```view
stored reader progress — inputs (hub, reader); outputs (checkpoint); bindings () — answers any number of (checkpoint)
  where ProgressRecording._checkpoint (reader, scope: hub) has (checkpoint)
```

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### reader progress result

Authored path: `ReaderProgress.ProgressResult`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 5.

```former
Former "reader progress result" — inputs (hub, reader); bindings (checkpoint); promises exactly one record — forms:
  the checkpoint of the first view "stored reader progress" with (hub, reader) has (checkpoint)
```

### reading document content

Authored path: `Reading.ArticleContent`.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.

```former
Former "reading document content" — inputs (hub, document, tokens); bindings (title, block, kind, body, alt); promises exactly one record — forms:
  a record of
    where Documenting._title (document, scope: hub) has (title)
    blocks: each view "eligible block" with (document, hub, tokens) has (alt, block, body, kind)
      form a record of
        alt
        block
        body
        kind
    document
    title
```

### reading document directory

Authored path: `Reading.ArticleDirectory`.
- Covered by [Reading](../../design/compositions/Reading.md), line 11.

```former
Former "reading document directory" — inputs (hub, tokens); bindings (document, title); promises exactly one record — forms:
  each view "readable document" with (hub, tokens) has (document)
    where Documenting._title (document, scope: hub) has (title)
    form a record of
      document
      title
```

### reading hub directory

Authored path: `Reading.HubDirectory`.
- Covered by [Reading](../../design/compositions/Reading.md), line 5.

```former
Former "reading hub directory" — inputs (); bindings (hub, name); promises exactly one record — forms:
  each HubCataloguing._hubs () has (hub, name)
    form a record of
      hub
      name
```

## Reactions

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### ReaderProgress.ClearProgress:hub-exists

Authored path: `ReaderProgress.ClearProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 7.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 12.

```reaction
when RequestBoundary.request (hub, path: "/progress/clear", reader, requestId)
where
  view "reader progress hub" with (hub)
then
  ProgressRecording.clear (reader, scope: hub)
```

### ReaderProgress.ClearProgress:hub-exists#2

Authored path: `ReaderProgress.ClearProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 7.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 12.

```reaction
when ProgressRecording.clear (reader, scope: hub, cleared), asked by ReaderProgress.ClearProgress:hub-exists
where
  earlier, RequestBoundary.request (hub, path: "/progress/clear", reader, requestId)
then
  RequestBoundary.respond (cleared, requestId)
```

### ReaderProgress.ClearProgress:hub-missing

Authored path: `ReaderProgress.ClearProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 7.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 12.

```reaction
when RequestBoundary.request (hub, path: "/progress/clear", reader, requestId)
where
  no view "reader progress hub" with (hub)
then
  RequestBoundary.respond (error: "HUB_NOT_FOUND", requestId)
```

### ReaderProgress.GetProgress:hub-exists

Authored path: `ReaderProgress.GetProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 7.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 10.

```reaction
when RequestBoundary.request (hub, path: "/progress/get", reader, requestId)
where
  view "reader progress hub" with (hub)
then
  RequestBoundary.respond (checkpoint: former "reader progress result" with (hub, reader), requestId)
```

### ReaderProgress.GetProgress:hub-missing

Authored path: `ReaderProgress.GetProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 7.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 10.

```reaction
when RequestBoundary.request (hub, path: "/progress/get", reader, requestId)
where
  no view "reader progress hub" with (hub)
then
  RequestBoundary.respond (error: "HUB_NOT_FOUND", requestId)
```

### ReaderProgress.ImportAnonymousProgress:invalid-selection

Authored path: `ReaderProgress.ImportAnonymousProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 15.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 18.

```reaction
when RequestBoundary.request (checkpoint, hub, path: "/internal/progress/import", reader, requestId)
where
  no view "reader progress selection" with (checkpoint, hub)
then
  RequestBoundary.respond (recorded: false, requestId)
```

### ReaderProgress.ImportAnonymousProgress:valid-selection

Authored path: `ReaderProgress.ImportAnonymousProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 15.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 18.

```reaction
when RequestBoundary.request (checkpoint, hub, path: "/internal/progress/import", reader, requestId)
where
  view "reader progress selection" with (checkpoint, hub)
then
  ProgressRecording.recordIfAbsent (checkpoint, reader, scope: hub)
```

### ReaderProgress.ImportAnonymousProgress:valid-selection#2

Authored path: `ReaderProgress.ImportAnonymousProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 15.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 18.

```reaction
when ProgressRecording.recordIfAbsent (checkpoint, reader, scope: hub, recorded), asked by ReaderProgress.ImportAnonymousProgress:valid-selection
where
  earlier, RequestBoundary.request (checkpoint, hub, path: "/internal/progress/import", reader, requestId)
then
  RequestBoundary.respond (recorded, requestId)
```

### ReaderProgress.RecordProgress:checkpoint-missing

Authored path: `ReaderProgress.RecordProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 7.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 11.

```reaction
when RequestBoundary.request (checkpoint, hub, path: "/progress/record", reader, requestId)
where
  view "reader progress hub" with (hub)
  no view "reader progress selection" with (checkpoint, hub)
then
  RequestBoundary.respond (error: "CHECKPOINT_NOT_FOUND", requestId)
```

### ReaderProgress.RecordProgress:hub-missing

Authored path: `ReaderProgress.RecordProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 7.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 11.

```reaction
when RequestBoundary.request (checkpoint, hub, path: "/progress/record", reader, requestId)
where
  no view "reader progress hub" with (hub)
then
  RequestBoundary.respond (error: "HUB_NOT_FOUND", requestId)
```

### ReaderProgress.RecordProgress:valid-selection

Authored path: `ReaderProgress.RecordProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 7.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 11.

```reaction
when RequestBoundary.request (checkpoint, hub, path: "/progress/record", reader, requestId)
where
  view "reader progress selection" with (checkpoint, hub)
then
  ProgressRecording.record (checkpoint, reader, scope: hub)
```

### ReaderProgress.RecordProgress:valid-selection#2

Authored path: `ReaderProgress.RecordProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 7.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 11.

```reaction
when ProgressRecording.record (checkpoint, reader, scope: hub), asked by ReaderProgress.RecordProgress:valid-selection
where
  earlier, RequestBoundary.request (checkpoint, hub, path: "/progress/record", reader, requestId)
then
  RequestBoundary.respond (checkpoint, requestId)
```

### Reading.BrowseHub:hub-missing

Authored path: `Reading.BrowseHub`.
- Covered by [Reading](../../design/compositions/Reading.md), line 11.
- Covered by [Reading](../../design/compositions/Reading.md), line 14.

```reaction
when RequestBoundary.request (hub, path: "/hubs/browse", reader, requestId)
where
  no view "reading hub" with (hub)
then
  RequestBoundary.respond (error: "HUB_NOT_FOUND", requestId)
```

### Reading.BrowseHub:selection-missing

Authored path: `Reading.BrowseHub`.
- Covered by [Reading](../../design/compositions/Reading.md), line 11.
- Covered by [Reading](../../design/compositions/Reading.md), line 14.

```reaction
when RequestBoundary.request (hub, path: "/hubs/browse", reader, requestId)
where
  view "reading hub" with (hub)
  no view "reading selection" with (hub, reader)
then
  RequestBoundary.respond (error: "PROGRESS_NOT_SET", requestId)
```

### Reading.BrowseHub:valid-selection

Authored path: `Reading.BrowseHub`.
- Covered by [Reading](../../design/compositions/Reading.md), line 11.
- Covered by [Reading](../../design/compositions/Reading.md), line 14.

```reaction
when RequestBoundary.request (hub, path: "/hubs/browse", reader, requestId)
where
  view "reading selection" with (hub, reader) has (tokens)
then
  RequestBoundary.respond (documents: former "reading document directory" with (hub, tokens), requestId)
```

### Reading.ListHubs

Authored path: `Reading.ListHubs`.
- Covered by [Reading](../../design/compositions/Reading.md), line 5.
- Covered by [Reading](../../design/compositions/Reading.md), line 8.

```reaction
when RequestBoundary.request (path: "/hubs/list", requestId)
then
  RequestBoundary.respond (hubs: former "reading hub directory", requestId)
```

### Reading.ReadArticle:hub-missing

Authored path: `Reading.ReadArticle`.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.
- Covered by [Reading](../../design/compositions/Reading.md), line 20.

```reaction
when RequestBoundary.request (document, hub, path: "/articles/read", reader, requestId)
where
  no view "reading hub" with (hub)
then
  RequestBoundary.respond (error: "HUB_NOT_FOUND", requestId)
```

### Reading.ReadArticle:readable-document

Authored path: `Reading.ReadArticle`.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.
- Covered by [Reading](../../design/compositions/Reading.md), line 20.

```reaction
when RequestBoundary.request (document, hub, path: "/articles/read", reader, requestId)
where
  view "reading selection" with (hub, reader) has (tokens)
  view "readable document" with (hub, tokens) has (document)
then
  RequestBoundary.respond (content: former "reading document content" with (document, hub, tokens), requestId)
```

### Reading.ReadArticle:selection-missing

Authored path: `Reading.ReadArticle`.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.
- Covered by [Reading](../../design/compositions/Reading.md), line 20.

```reaction
when RequestBoundary.request (document, hub, path: "/articles/read", reader, requestId)
where
  view "reading hub" with (hub)
  no view "reading selection" with (hub, reader)
then
  RequestBoundary.respond (error: "PROGRESS_NOT_SET", requestId)
```

### Reading.ReadArticle:unavailable-document

Authored path: `Reading.ReadArticle`.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.
- Covered by [Reading](../../design/compositions/Reading.md), line 20.

```reaction
when RequestBoundary.request (document, hub, path: "/articles/read", reader, requestId)
where
  view "reading selection" with (hub, reader) has (tokens)
  no view "readable document" with (hub, tokens) has (document)
then
  RequestBoundary.respond (content: null, requestId)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/articles/read` — requires `hub`, `reader`, `document`
- `/hubs/browse` — requires `hub`, `reader`
- `/internal/progress/import` — requires `hub`, `reader`, `checkpoint`
- `/progress/clear` — requires `hub`, `reader`
- `/progress/get` — requires `hub`, `reader`
- `/progress/record` — requires `hub`, `reader`, `checkpoint`
