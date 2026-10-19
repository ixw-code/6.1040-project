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

#### Queries

- `_sequences(scope: Scope) : many (sequence: Sequence)`
- `_checkpoints(scope: Scope, sequence: Sequence) : many (checkpoint: Checkpoint, label: String, position: Number)`
- `_prefix(scope: Scope, sequence: Sequence, checkpoint: Checkpoint) : many (checkpoint: Checkpoint)`
- `_prefixTokens(scope: Scope, sequence: Sequence, checkpoint: Checkpoint) : optional (tokens: TokenSet)`
- `_contains(scope: Scope, sequence: Sequence, tokens: TokenSet) : one (valid: Flag)`

#### Instances

- `Checkpointing` — instance of `Checkpointing` — [Wikiplotter Alpha Types](../../design/types.md), line 36.
  - `Scope` is `HubCataloguing.Hub` — [Wikiplotter Alpha Types](../../design/types.md), line 37.

### Documenting

Defined in [Documenting](../../design/concepts/Documenting.md), line 1.

#### Actions

- `create(scope: Scope, title: String, blocks: BlockInputs) : returns (document: Document)`
  - Refuses `DOCUMENT_NAME_REQUIRED`: A document name is required.
  - Refuses `DOCUMENT_NAME_TAKEN`: This document name is already used in the scope.
  - Refuses `INVALID_DOCUMENT_BLOCKS`: Provide valid text or image blocks.

#### Queries

- `_documents(scope: Scope) : many (document: Document)`
- `_title(scope: Scope, document: Document) : optional (title: String)`
- `_blocks(scope: Scope, document: Document) : many (block: Block, kind: BlockType, body: Content, alt: String)`

#### Instances

- `Documenting` — instance of `Documenting` — [Wikiplotter Alpha Types](../../design/types.md), line 33.
  - `Scope` is `HubCataloguing.Hub` — [Wikiplotter Alpha Types](../../design/types.md), line 34.

### HubCataloguing

Defined in [HubCataloguing](../../design/concepts/HubCataloguing.md), line 1.

#### Actions

- `create(name: String) : returns (hub: Hub)`
  - Refuses `HUB_NAME_REQUIRED`: A hub name is required.
  - Refuses `HUB_NAME_TAKEN`: This hub name is already in use.
- `rename(hub: Hub, name: String) : returns (hub: Hub)`
  - Refuses `HUB_NOT_FOUND`: There is no such hub.
  - Refuses `HUB_RENAME_NAME_REQUIRED`: A replacement hub name is required.
  - Refuses `HUB_RENAME_NAME_TAKEN`: Another hub already uses this name.

#### Queries

- `_hub(name: String) : optional (hub: Hub)`
- `_hubs() : many (hub: Hub, name: String)`

#### Instances

- `HubCataloguing` — instance of `HubCataloguing` — [Wikiplotter Alpha Types](../../design/types.md), line 31.

### ProgressRecording

Defined in [ProgressRecording](../../design/concepts/ProgressRecording.md), line 1.

#### Actions

- `record(scope: Scope, reader: Reader, checkpoint: Checkpoint) : returns ()`
- `clear(scope: Scope, reader: Reader) : returns (cleared: Flag)`

#### Queries

- `_checkpoint(scope: Scope, reader: Reader) : optional (checkpoint: Checkpoint)`

#### Instances

- `ProgressRecording` — instance of `ProgressRecording` — [Wikiplotter Alpha Types](../../design/types.md), line 39.
  - `Checkpoint` is `Checkpointing.Checkpoint` — [Wikiplotter Alpha Types](../../design/types.md), line 42.
  - `Reader` is `Reader` — [Wikiplotter Alpha Types](../../design/types.md), line 41.
  - `Scope` is `HubCataloguing.Hub` — [Wikiplotter Alpha Types](../../design/types.md), line 40.

### RequirementTagging

Defined in [RequirementTagging](../../design/concepts/RequirementTagging.md), line 1.

#### Actions

- `tag(item: Item, required: TokenSet) : returns ()`
- `untag(item: Item) : returns ()`
  - Refuses `REQUIREMENT_RULE_NOT_FOUND`: This item has no requirement rule.

#### Queries

- `_rule(item: Item) : optional (required: TokenSet)`
- `_eligible(item: Item, tokens: TokenSet) : one (eligible: Flag)`

#### Instances

- `RequirementTagging` — instance of `RequirementTagging` — [Wikiplotter Alpha Types](../../design/types.md), line 44.
  - `Item` is `ContentItem` — [Wikiplotter Alpha Types](../../design/types.md), line 45.
  - `Token` is `Checkpointing.Checkpoint` — [Wikiplotter Alpha Types](../../design/types.md), line 46.

## Application types

Concrete types:

- `ContentItem` — [Wikiplotter Alpha Types](../../design/types.md), line 23.
- `Reader` — [Wikiplotter Alpha Types](../../design/types.md), line 19.

## Views

_Views name reusable conditions. Multiple `where` blocks are alternatives._

### content management hub

Authored path: `ContentManagement.ExistingHub`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 5.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 11.

```view
content management hub — inputs (hub); outputs (); bindings ()
  where HubCataloguing._hubs () has (hub)
```

### allowed hub requirements

Authored path: `ContentManagement.AllowedRequirements`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 11.

```view
allowed hub requirements — inputs (hub, required); outputs (); bindings (sequence)
  where
    view "content management hub" with (hub)
    Checkpointing._sequences (scope: hub) has (sequence)
    Checkpointing._contains (scope: hub, sequence, tokens: required) has (valid: true)
```

### block in hub

Authored path: `ContentManagement.ScopedBlock`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 11.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 17.

```view
block in hub — inputs (hub, item); outputs (); bindings (document)
  where
    view "content management hub" with (hub)
    Documenting._documents (scope: hub) has (document)
    Documenting._blocks (document, scope: hub) has (block: item)
```

### document in hub

Authored path: `ContentManagement.ScopedDocument`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 11.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 17.

```view
document in hub — inputs (hub, item); outputs (); bindings ()
  where
    view "content management hub" with (hub)
    Documenting._documents (scope: hub) has (document: item)
```

### eligible block

Authored path: `Reading.EligibleBlock`.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.

```view
eligible block — inputs (hub, document, tokens); outputs (block, kind, body, alt); bindings () — answers any number of (block, kind, body, alt)
  where
    Documenting._blocks (document, scope: hub) has (alt, block, body, kind)
    RequirementTagging._eligible (item: block, tokens) has (eligible: true)
```

### existing hub

Authored path: `HubManagement.ExistingHub`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 14.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 20.

```view
existing hub — inputs (hub); outputs (); bindings ()
  where HubCataloguing._hubs () has (hub)
```

### hub sequence

Authored path: `HubManagement.HubSequence`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 20.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 22.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 24.

```view
hub sequence — inputs (hub); outputs (sequence); bindings () — answers at most one (sequence)
  where
    view "existing hub" with (hub)
    Checkpointing._sequences (scope: hub) has (sequence)
```

### hub checkpoint

Authored path: `HubManagement.HubCheckpoint`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 24.

```view
hub checkpoint — inputs (hub, checkpoint); outputs (); bindings (sequence)
  where
    view "hub sequence" with (hub) has (sequence)
    Checkpointing._checkpoints (scope: hub, sequence) has (checkpoint)
```

### readable document

Authored path: `Reading.ReadableDocument`.
- Covered by [Reading](../../design/compositions/Reading.md), line 11.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.

```view
readable document — inputs (hub, tokens); outputs (document); bindings () — answers any number of (document)
  where
    Documenting._documents (scope: hub) has (document)
    RequirementTagging._eligible (item: document, tokens) has (eligible: true)
```

### reader progress hub

Authored path: `ReaderProgress.ExistingHub`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 5.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 11.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 17.

```view
reader progress hub — inputs (hub); outputs (); bindings ()
  where HubCataloguing._hubs () has (hub)
```

### reader progress selection

Authored path: `ReaderProgress.ValidSelection`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 11.

```view
reader progress selection — inputs (hub, checkpoint); outputs (); bindings (sequence)
  where
    view "reader progress hub" with (hub)
    Checkpointing._sequences (scope: hub) has (sequence)
    Checkpointing._checkpoints (scope: hub, sequence) has (checkpoint)
```

### reading hub

Authored path: `Reading.ExistingHub`.
- Covered by [Reading](../../design/compositions/Reading.md), line 11.

```view
reading hub — inputs (hub); outputs (); bindings ()
  where HubCataloguing._hubs () has (hub)
```

### reading selection

Authored path: `Reading.ReaderSelection`.
- Covered by [Reading](../../design/compositions/Reading.md), line 11.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.

```view
reading selection — inputs (hub, reader); outputs (tokens); bindings (sequence, checkpoint) — answers at most one (tokens)
  where
    view "reading hub" with (hub)
    Checkpointing._sequences (scope: hub) has (sequence)
    ProgressRecording._checkpoint (reader, scope: hub) has (checkpoint)
    Checkpointing._prefixTokens (checkpoint, scope: hub, sequence) has (tokens)
```

### stored reader progress

Authored path: `ReaderProgress.StoredProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 5.

```view
stored reader progress — inputs (hub, reader); outputs (checkpoint); bindings () — answers any number of (checkpoint)
  where ProgressRecording._checkpoint (reader, scope: hub) has (checkpoint)
```

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### checkpoint choices

Authored path: `HubManagement.CheckpointChoices`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 20.

```former
Former "checkpoint choices" — inputs (hub, sequence); bindings (checkpoint, label, position); promises exactly one record — forms:
  each Checkpointing._checkpoints (scope: hub, sequence) has (checkpoint, label, position)
    form a record of
      checkpoint
      label
      position
```

### created document blocks

Authored path: `ContentManagement.CreatedDocument`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 5.

```former
Former "created document blocks" — inputs (hub, document); bindings (block); promises exactly one record — forms:
  each Documenting._blocks (document, scope: hub) has (block)
    form a record of
      block
```

### reader progress result

Authored path: `ReaderProgress.ProgressResult`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 5.

```former
Former "reader progress result" — inputs (hub, reader); bindings (checkpoint); promises exactly one record — forms:
  the checkpoint of the first view "stored reader progress" with (hub, reader) has (checkpoint)
```

### reading document content

Authored path: `Reading.DocumentContent`.
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

Authored path: `Reading.DocumentDirectory`.
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

### sequence list

Authored path: `HubManagement.SequenceList`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 14.

```former
Former "sequence list" — inputs (hub); bindings (sequence); promises exactly one record — forms:
  each Checkpointing._sequences (scope: hub) has (sequence)
    form a record of
      sequence
```

## Reactions

### ContentManagement.CreateDocument:existing-hub

Authored path: `ContentManagement.CreateDocument`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 5.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 8.

```reaction
when RequestBoundary.request (blocks, hub, path: "/setup/documents/create", requestId, title)
where
  view "content management hub" with (hub)
then
  Documenting.create (blocks, scope: hub, title)
```

### ContentManagement.CreateDocument:existing-hub#2

Authored path: `ContentManagement.CreateDocument`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 5.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 8.

```reaction
when Documenting.create (blocks, scope: hub, title, document), asked by ContentManagement.CreateDocument:existing-hub
where
  earlier, RequestBoundary.request (blocks, hub, path: "/setup/documents/create", requestId, title)
then
  RequestBoundary.respond (blocks: former "created document blocks" with (document, hub), document, requestId)
```

### ContentManagement.CreateDocument:missing-hub

Authored path: `ContentManagement.CreateDocument`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 5.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 8.

```reaction
when RequestBoundary.request (blocks, hub, path: "/setup/documents/create", requestId, title)
where
  no view "content management hub" with (hub)
then
  RequestBoundary.respond (error: "HUB_NOT_FOUND", requestId)
```

### ContentManagement.TagItem:block-and-tokens-valid

Authored path: `ContentManagement.TagItem`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 11.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 14.

```reaction
when RequestBoundary.request (hub, item, path: "/setup/items/tag", requestId, required)
where
  no view "document in hub" with (hub, item)
  view "block in hub" with (hub, item)
  view "allowed hub requirements" with (hub, required)
then
  RequirementTagging.tag (item, required)
```

### ContentManagement.TagItem:block-and-tokens-valid#2

Authored path: `ContentManagement.TagItem`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 11.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 14.

```reaction
when RequirementTagging.tag (item, required), asked by ContentManagement.TagItem:block-and-tokens-valid
where
  earlier, RequestBoundary.request (hub, item, path: "/setup/items/tag", requestId, required)
then
  RequestBoundary.respond (item, requestId)
```

### ContentManagement.TagItem:block-tokens-invalid

Authored path: `ContentManagement.TagItem`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 11.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 14.

```reaction
when RequestBoundary.request (hub, item, path: "/setup/items/tag", requestId, required)
where
  no view "document in hub" with (hub, item)
  view "block in hub" with (hub, item)
  no view "allowed hub requirements" with (hub, required)
then
  RequestBoundary.respond (error: "INVALID_REQUIREMENTS", requestId)
```

### ContentManagement.TagItem:document-and-tokens-valid

Authored path: `ContentManagement.TagItem`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 11.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 14.

```reaction
when RequestBoundary.request (hub, item, path: "/setup/items/tag", requestId, required)
where
  view "document in hub" with (hub, item)
  view "allowed hub requirements" with (hub, required)
then
  RequirementTagging.tag (item, required)
```

### ContentManagement.TagItem:document-and-tokens-valid#2

Authored path: `ContentManagement.TagItem`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 11.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 14.

```reaction
when RequirementTagging.tag (item, required), asked by ContentManagement.TagItem:document-and-tokens-valid
where
  earlier, RequestBoundary.request (hub, item, path: "/setup/items/tag", requestId, required)
then
  RequestBoundary.respond (item, requestId)
```

### ContentManagement.TagItem:document-tokens-invalid

Authored path: `ContentManagement.TagItem`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 11.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 14.

```reaction
when RequestBoundary.request (hub, item, path: "/setup/items/tag", requestId, required)
where
  view "document in hub" with (hub, item)
  no view "allowed hub requirements" with (hub, required)
then
  RequestBoundary.respond (error: "INVALID_REQUIREMENTS", requestId)
```

### ContentManagement.TagItem:item-missing

Authored path: `ContentManagement.TagItem`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 11.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 14.

```reaction
when RequestBoundary.request (hub, item, path: "/setup/items/tag", requestId, required)
where
  no view "document in hub" with (hub, item)
  no view "block in hub" with (hub, item)
then
  RequestBoundary.respond (error: "ITEM_NOT_FOUND", requestId)
```

### ContentManagement.UntagItem:block-in-hub

Authored path: `ContentManagement.UntagItem`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 17.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 20.

```reaction
when RequestBoundary.request (hub, item, path: "/setup/items/untag", requestId)
where
  no view "document in hub" with (hub, item)
  view "block in hub" with (hub, item)
then
  RequirementTagging.untag (item)
```

### ContentManagement.UntagItem:block-in-hub#2

Authored path: `ContentManagement.UntagItem`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 17.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 20.

```reaction
when RequirementTagging.untag (item), asked by ContentManagement.UntagItem:block-in-hub
where
  earlier, RequestBoundary.request (hub, item, path: "/setup/items/untag", requestId)
then
  RequestBoundary.respond (item, requestId)
```

### ContentManagement.UntagItem:document-in-hub

Authored path: `ContentManagement.UntagItem`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 17.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 20.

```reaction
when RequestBoundary.request (hub, item, path: "/setup/items/untag", requestId)
where
  view "document in hub" with (hub, item)
then
  RequirementTagging.untag (item)
```

### ContentManagement.UntagItem:document-in-hub#2

Authored path: `ContentManagement.UntagItem`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 17.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 20.

```reaction
when RequirementTagging.untag (item), asked by ContentManagement.UntagItem:document-in-hub
where
  earlier, RequestBoundary.request (hub, item, path: "/setup/items/untag", requestId)
then
  RequestBoundary.respond (item, requestId)
```

### ContentManagement.UntagItem:item-missing

Authored path: `ContentManagement.UntagItem`.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 17.
- Covered by [ContentManagement](../../design/compositions/ContentManagement.md), line 20.

```reaction
when RequestBoundary.request (hub, item, path: "/setup/items/untag", requestId)
where
  no view "document in hub" with (hub, item)
  no view "block in hub" with (hub, item)
then
  RequestBoundary.respond (error: "ITEM_NOT_FOUND", requestId)
```

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

### HubManagement.AppendCheckpoint:foreign-sequence

Authored path: `HubManagement.AppendCheckpoint`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 5.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 22.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 28.

```reaction
when RequestBoundary.request (hub, label, path: "/checkpoints/append", requestId, sequence)
where
  no view "hub sequence" with (hub) has (sequence)
then
  RequestBoundary.respond (error: "SEQUENCE_NOT_FOUND", requestId)
```

### HubManagement.AppendCheckpoint:sequence-belongs-to-hub

Authored path: `HubManagement.AppendCheckpoint`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 5.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 22.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 28.

```reaction
when RequestBoundary.request (hub, label, path: "/checkpoints/append", requestId, sequence)
where
  view "hub sequence" with (hub) has (sequence)
then
  Checkpointing.append (label, sequence)
```

### HubManagement.AppendCheckpoint:sequence-belongs-to-hub#2

Authored path: `HubManagement.AppendCheckpoint`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 5.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 22.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 28.

```reaction
when Checkpointing.append (label, sequence, checkpoint), asked by HubManagement.AppendCheckpoint:sequence-belongs-to-hub
where
  earlier, RequestBoundary.request (hub, label, path: "/checkpoints/append", requestId, sequence)
then
  RequestBoundary.respond (checkpoint, requestId)
```

### HubManagement.CreateHub

Authored path: `HubManagement.CreateHub`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 5.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 10.

```reaction
when RequestBoundary.request (label, name, path: "/hubs/create", requestId)
then
  HubCataloguing.create (name)
```

### HubManagement.CreateHub#2

Authored path: `HubManagement.CreateHub`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 5.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 10.

```reaction
when HubCataloguing.create (name, hub), asked by HubManagement.CreateHub
where
  earlier, RequestBoundary.request (label, name, path: "/hubs/create", requestId)
then
  Checkpointing.create (label, scope: hub)
```

### HubManagement.CreateHub#3

Authored path: `HubManagement.CreateHub`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 5.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 10.

```reaction
when Checkpointing.create (label, scope: hub, sequence), asked by HubManagement.CreateHub#2
then
  Checkpointing.append (label, sequence)
```

### HubManagement.CreateHub#4

Authored path: `HubManagement.CreateHub`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 5.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 10.

```reaction
when Checkpointing.append (label, sequence, checkpoint), asked by HubManagement.CreateHub#3
where
  earlier, HubCataloguing.create (name, hub), asked by HubManagement.CreateHub
  earlier, RequestBoundary.request (label, name, path: "/hubs/create", requestId)
then
  RequestBoundary.respond (hub, requestId, sequence)
```

### HubManagement.GetSequences:hub-exists

Authored path: `HubManagement.GetSequences`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 14.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 17.

```reaction
when RequestBoundary.request (hub, path: "/hubs/sequences", requestId)
where
  view "existing hub" with (hub)
then
  RequestBoundary.respond (requestId, sequences: former "sequence list" with (hub))
```

### HubManagement.GetSequences:hub-missing

Authored path: `HubManagement.GetSequences`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 14.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 17.

```reaction
when RequestBoundary.request (hub, path: "/hubs/sequences", requestId)
where
  no view "existing hub" with (hub)
then
  RequestBoundary.respond (error: "HUB_NOT_FOUND", requestId)
```

### HubManagement.ListCheckpoints:sequence-exists

Authored path: `HubManagement.ListCheckpoints`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 20.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 27.

```reaction
when RequestBoundary.request (hub, path: "/checkpoints/list", requestId)
where
  view "hub sequence" with (hub) has (sequence)
then
  RequestBoundary.respond (checkpoints: former "checkpoint choices" with (hub, sequence), requestId, sequence)
```

### HubManagement.ListCheckpoints:sequence-missing

Authored path: `HubManagement.ListCheckpoints`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 20.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 27.

```reaction
when RequestBoundary.request (hub, path: "/checkpoints/list", requestId)
where
  no view "hub sequence" with (hub)
then
  RequestBoundary.respond (error: "SEQUENCE_NOT_FOUND", requestId)
```

### HubManagement.RelabelCheckpoint:checkpoint-belongs-to-hub

Authored path: `HubManagement.RelabelCheckpoint`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 24.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 29.

```reaction
when RequestBoundary.request (checkpoint, hub, label, path: "/checkpoints/relabel", requestId)
where
  view "hub checkpoint" with (checkpoint, hub)
then
  Checkpointing.relabel (checkpoint, label, scope: hub)
```

### HubManagement.RelabelCheckpoint:checkpoint-belongs-to-hub#2

Authored path: `HubManagement.RelabelCheckpoint`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 24.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 29.

```reaction
when Checkpointing.relabel (checkpoint, label, scope: hub), asked by HubManagement.RelabelCheckpoint:checkpoint-belongs-to-hub
where
  earlier, RequestBoundary.request (checkpoint, hub, label, path: "/checkpoints/relabel", requestId)
then
  RequestBoundary.respond (checkpoint, requestId)
```

### HubManagement.RelabelCheckpoint:foreign-checkpoint

Authored path: `HubManagement.RelabelCheckpoint`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 24.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 29.

```reaction
when RequestBoundary.request (checkpoint, hub, label, path: "/checkpoints/relabel", requestId)
where
  no view "hub checkpoint" with (checkpoint, hub)
then
  RequestBoundary.respond (error: "CHECKPOINT_NOT_FOUND", requestId)
```

### HubManagement.RenameHub

Authored path: `HubManagement.RenameHub`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 7.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 11.

```reaction
when RequestBoundary.request (hub, name, path: "/hubs/rename", requestId)
then
  HubCataloguing.rename (hub, name)
```

### HubManagement.RenameHub#2

Authored path: `HubManagement.RenameHub`.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 7.
- Covered by [HubManagement](../../design/compositions/HubManagement.md), line 11.

```reaction
when HubCataloguing.rename (hub, name), asked by HubManagement.RenameHub
where
  earlier, RequestBoundary.request (hub, name, path: "/hubs/rename", requestId)
then
  RequestBoundary.respond (hub, requestId)
```

### ReaderProgress.ClearProgress:hub-exists

Authored path: `ReaderProgress.ClearProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 17.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 20.

```reaction
when RequestBoundary.request (hub, path: "/progress/clear", reader, requestId)
where
  view "reader progress hub" with (hub)
then
  ProgressRecording.clear (reader, scope: hub)
```

### ReaderProgress.ClearProgress:hub-exists#2

Authored path: `ReaderProgress.ClearProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 17.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 20.

```reaction
when ProgressRecording.clear (reader, scope: hub, cleared), asked by ReaderProgress.ClearProgress:hub-exists
where
  earlier, RequestBoundary.request (hub, path: "/progress/clear", reader, requestId)
then
  RequestBoundary.respond (cleared, requestId)
```

### ReaderProgress.ClearProgress:hub-missing

Authored path: `ReaderProgress.ClearProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 17.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 20.

```reaction
when RequestBoundary.request (hub, path: "/progress/clear", reader, requestId)
where
  no view "reader progress hub" with (hub)
then
  RequestBoundary.respond (error: "HUB_NOT_FOUND", requestId)
```

### ReaderProgress.GetProgress:hub-exists

Authored path: `ReaderProgress.GetProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 5.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 8.

```reaction
when RequestBoundary.request (hub, path: "/progress/get", reader, requestId)
where
  view "reader progress hub" with (hub)
then
  RequestBoundary.respond (checkpoint: former "reader progress result" with (hub, reader), requestId)
```

### ReaderProgress.GetProgress:hub-missing

Authored path: `ReaderProgress.GetProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 5.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 8.

```reaction
when RequestBoundary.request (hub, path: "/progress/get", reader, requestId)
where
  no view "reader progress hub" with (hub)
then
  RequestBoundary.respond (error: "HUB_NOT_FOUND", requestId)
```

### ReaderProgress.RecordProgress:checkpoint-missing

Authored path: `ReaderProgress.RecordProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 11.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 14.

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
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 11.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 14.

```reaction
when RequestBoundary.request (checkpoint, hub, path: "/progress/record", reader, requestId)
where
  no view "reader progress hub" with (hub)
then
  RequestBoundary.respond (error: "HUB_NOT_FOUND", requestId)
```

### ReaderProgress.RecordProgress:valid-selection

Authored path: `ReaderProgress.RecordProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 11.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 14.

```reaction
when RequestBoundary.request (checkpoint, hub, path: "/progress/record", reader, requestId)
where
  view "reader progress selection" with (checkpoint, hub)
then
  ProgressRecording.record (checkpoint, reader, scope: hub)
```

### ReaderProgress.RecordProgress:valid-selection#2

Authored path: `ReaderProgress.RecordProgress`.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 11.
- Covered by [ReaderProgress](../../design/compositions/ReaderProgress.md), line 14.

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

### Reading.ReadDocument:hub-missing

Authored path: `Reading.ReadDocument`.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.
- Covered by [Reading](../../design/compositions/Reading.md), line 20.

```reaction
when RequestBoundary.request (document, hub, path: "/content/documents/read", reader, requestId)
where
  no view "reading hub" with (hub)
then
  RequestBoundary.respond (error: "HUB_NOT_FOUND", requestId)
```

### Reading.ReadDocument:readable-document

Authored path: `Reading.ReadDocument`.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.
- Covered by [Reading](../../design/compositions/Reading.md), line 20.

```reaction
when RequestBoundary.request (document, hub, path: "/content/documents/read", reader, requestId)
where
  view "reading selection" with (hub, reader) has (tokens)
  view "readable document" with (hub, tokens) has (document)
then
  RequestBoundary.respond (content: former "reading document content" with (document, hub, tokens), requestId)
```

### Reading.ReadDocument:selection-missing

Authored path: `Reading.ReadDocument`.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.
- Covered by [Reading](../../design/compositions/Reading.md), line 20.

```reaction
when RequestBoundary.request (document, hub, path: "/content/documents/read", reader, requestId)
where
  view "reading hub" with (hub)
  no view "reading selection" with (hub, reader)
then
  RequestBoundary.respond (error: "PROGRESS_NOT_SET", requestId)
```

### Reading.ReadDocument:unavailable-document

Authored path: `Reading.ReadDocument`.
- Covered by [Reading](../../design/compositions/Reading.md), line 17.
- Covered by [Reading](../../design/compositions/Reading.md), line 20.

```reaction
when RequestBoundary.request (document, hub, path: "/content/documents/read", reader, requestId)
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

- `/checkpoints/append` — requires `hub`, `sequence`, `label`
- `/checkpoints/list` — requires `hub`
- `/checkpoints/relabel` — requires `hub`, `checkpoint`, `label`
- `/content/documents/read` — requires `hub`, `reader`, `document`
- `/hubs/browse` — requires `hub`, `reader`
- `/hubs/create` — requires `name`, `label`
- `/hubs/rename` — requires `hub`, `name`
- `/hubs/sequences` — requires `hub`
- `/progress/clear` — requires `hub`, `reader`
- `/progress/get` — requires `hub`, `reader`
- `/progress/record` — requires `hub`, `reader`, `checkpoint`
- `/setup/documents/create` — requires `hub`, `title`, `blocks`
- `/setup/items/tag` — requires `hub`, `item`, `required`
- `/setup/items/untag` — requires `hub`, `item`
