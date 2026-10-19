# Wikiplotter - Alpha (MVP) Design

## Summary
In the initial design under [INITIAL.md](./INITIAL.md), Wikiplotter's core filtering functionality depends on the **Checkpointing**, **ProgressRecording**, and **RequirementTagging** concepts, with **DocumentVersioning** and **CollectionGrouping** serving as entry points into the actual wiki functionality. 

For the Alpha, the **minimum required functionality** for the design is:

1. Record, retrieve, change, and clear readers' progress within a hub.
2. Define an ordered checkpoint sequence for each hub.
3. Create scoped documents with required titles and ordered text and image blocks.
4. Assign requirements to documents and blocks before readers can see them.
5. Establish and discover named spaces (wiki hubs) as the shared scope.
6. Browse eligible article titles and read only eligible content.

Alpha uses dummy reader identities (e.g. browser storage) and premade document assemblies. Checkpoint creation, document creation, and requirement tagging don't yet require dedicated interfaces, instead serving views via clever composition of current concepts. 

Hence, the following features are not strictly necessary, but may be expanded to future iterations:

1. Reader accounts/authentication
2. Public contribution and access control
3. Document editing, uploading, and version history 
4. Nested collections and article directory navigation 
5. Filtered search functionality
6. Polished wiki UI (to support the above functionality)

The concept changes from INITIAL → ALPHA are: 

- DocumentVersioning → **Documenting**
- CollectionGrouping → **HubCataloguing** 

**Documenting** is a simpler concept supporting the minimum functionality required for readers to view articles. Versioning would be more appropriate for a later expansion on top of Documenting. 

**HubCataloguing** is a more accurate representation of how Wikiplotter will be structured as a collection of Hubs (scopes), and simply supplies the scope that each concept already belongs to. CollectionGrouping would be more useful in the future for targeted grouping functionality, perhaps in the form of a concept like DirectoryNavigating. 


## Design Changes

### What's New

#### 1. Documenting [Scope]  (formalized in [Documenting.md](../../design/concepts/Documenting.md))
**purpose** maintain identifiable, scoped documents composed of ordered content blocks  

**principle** after a document is created within a scope, it can be retrieved by identity and its content blocks can be viewed in the order they were created  

**state**  
- a set of Documents (w/ a unique name and scope, and a seq of Blocks)  
- a set of Blocks (w/ a kind BlockType, a body Content, and alt String)

**actions**  
- create(scope, title, blocks): (document)

**queries**  
- _documents(scope): many (document)
- _title(scope, document): optional (title)
- _blocks(scope, document): many (block, kind, body, alt)

Documenting manages the state of documents stored within a scope on Wikiplotter, and keeps track of that document-to-scope relationship. It is independent from hub or requirement logic, and document views are served via composition that checks for scope and reader eligibility.

#### 2. HubCataloguing (formalized in [HubCataloguing.md](../../design/concepts/HubCataloguing.md))
**Purpose:** establish identifiable, named spaces that can be discovered and selected.

**Principle:** after a hub is created, it appears in the hub directory and can be selected by identity even before it contains any documents. Renaming it preserves that identity.

**State:**
- A set of Hubs (w/ unique name)

**Actions:**
- create(name): (hub) - create a named hub.
- rename(hub, name): (hub) - update the name of an existing hub without changing its identity.

**Queries:**
- _hub(name): optional (hub) - resolve an existing hub.
- _hubs(): many (hub, name) - list hubs in deterministic identity order.

HubCataloguing supplies scope identities. Establishing a usable hub also initializes Checkpointing through composition. Hub deletion is outside Alpha and Beta because it would require policies for all scoped state.


### Concept Clarification
#### 3. ProgressRecording [Scope, Reader, Checkpoint] (formalized in [ProgressRecording.md](../../design/concepts/ProgressRecording.md))
**Purpose:** remember a reader's progress point within a scope.

**Principle:** after a reader records a checkpoint in a scope, the position can be retrieved, replaced with another position, or cleared without affecting other readers or scopes.

**State:** 
- a set of Records (w/ unique scope and reader, and checkpoint)

**Actions:**
- record(scope, reader, checkpoint) - create or update a reader's progress checkpoint.
- clear(scope, reader): (cleared) - delete a reader's record.

**Queries:**
- _checkpoint(scope, reader): optional (checkpoint)

Composition validates hub and checkpoint existence before recording. Missing progress is distinct from an explicit "NotStarted" selection.

#### 4. Checkpointing [Scope] (formalized in [Checkpointing.md](../../design/concepts/Checkpointing.md))
**Purpose:** define an ordered progression that can be interpreted unambiguously within a scope.

**Principle:** after checkpoints are appended to a scope's sequence, selecting one yields that checkpoint and every earlier checkpoint as a deterministic completed prefix

**State:**
- a set of Sequences (w/ a scope, a label, seq of Checkpoints) 
- a set of Checkpoints (w/ a label and position in sequence)

**Actions:**
- create(scope, label): (sequence)
- append(sequence, label): (checkpoint) - create a checkpoint at the end of the sequence
- relabel(scope, checkpoint, label): (checkpoint) - change an ordinary checkpoint's label without changing identity or order

**Queries:**
- _sequences(scope): many (sequence)
- _checkpoints(scope, sequence): many (checkpoint, label, position) 
- _prefix(scope, sequence, checkpoint): optional (completed) - return a prefix of all completed checkpoints
- _prefixTokens(scope, sequence, checkpoint): optional (tokens) - return the same inclusive prefix as one token array for eligibility checks

Checkpoint labels must be spoiler-neutral, and sequences must have at least one label representing a status of 'Not Started'. Appending new checkpoints does not change what existing checkpoint selections mean.

Reordering, deleting, replacing, and branching sequences are deferred pieces of functionality. 

#### 5. RequirementTagging [Item, Token]
**Purpose:** determine whether an item is eligible by checking its requirements are satisfied

**Principle:** after an item is classified, it is eligible only when the supplied tokens contain every required token. Removing its classification makes it ineligible

**State:** 
- a set of Rules (w/ an item, set of tokens)

**Actions:**
- tag(item, required) - create or replace a Rule w/ item's required set.
- untag(item) - remove an existing rule, or refuse if none exists.

**Queries:**
- _rule(item): optional (required)
- _eligible(item, tokens): (eligible) - true only if a rule exists and all its requirements are included in the supplied token set.

In this iteration, eligibility is determined through token set inclusion. By default, any check against an item without a rule is ineligible. RequirementTagging currently only supports association-based eligibility, which is sufficient for linear checkpoint sequences. 

More complicated eligibility requirements are deferred for later iterations, which may require an overhaul of this concept in the future. 
    
### Application Bindings and Ownership

| Parameter or relationship | Binding / owner |
| --- | --- |
| Documenting.Scope, Checkpointing.Scope, ProgressRecording.Scope | HubCataloguing.Hub |
| ProgressRecording.Reader | Application-defined identity |
| ProgressRecording.Checkpoint | Checkpointing.Checkpoint |
| RequirementTagging.Token | Checkpointing.Checkpoint |
| RequirementTagging.Item | Documenting.Document or Documenting.Block |
| Document-to-hub association | Documenting only |
| Document-level requirements | Rule keyed by document ID |
| Block-level requirements | Rule keyed by block ID |


### Reactions and Compositions

| Composition module | Feature / flow | Required coordination |
| --- | --- | --- |
| `HubManagement` | Establish a hub | HubCataloguing.create → Checkpointing.create for its ID. Return the hub only after sequence initialization succeeds. Retry initialization idempotently after a partial failure. |
| `HubManagement` | Manage checkpoints | Resolve an existing hub/sequence before append or relabel. Alpha exposes these unauthenticated operations through reader HTTP. |
| `ContentManagement` | Create a document | Validate hub existence → Documenting.create with the entire ordered content array. No CollectionGrouping.assign step. Keep this workflow local-only, outside reader HTTP. |
| `ContentManagement` | Classify an item | Resolve the document or block through Documenting._documents and _blocks → validate every required token against the hub's full checkpoint list, including NotStarted → RequirementTagging.tag. |
| `ContentManagement` | Validate the dataset | Require a sequence for every hub, valid scope for every document, explicit rules for every document/block, same-hub tokens, and safe title/document thresholds. Refuse startup on invalid data. |
| `ReaderProgress` | Get/select/reset progress | Validate hub and reader; for record, validate the checkpoint with _prefix before ProgressRecording.record. Return null for missing progress; clear restores that state. |
| `Reading` | Browse a hub | Resolve stored progress → derive inclusive prefix tokens → list scoped documents → check document eligibility → read eligible document titles from document state. |
| `Reading` | Read a document | Resolve stored progress → derive inclusive prefix tokens → validate document scope and eligibility → form eligible text and image blocks in original order. |



## Implementation Plan 
The implementation for the Alpha will happen in the following incremental steps:

1.  Formalize the concept specifications, contracts, and bindings. 
2.  Implement and test concepts individually, starting with in-memory repositories.
3.  Replace in-memory state with MongoDB operations and test persistence.
4.  Implement and test the setup composition for Hub and Content.
5.  Invoke the local composition gateways to create premade fixture data for demonstration purposes. 
6.  Implement and test composition for ReaderProgress and Reading. 
7.  Expose the application's reader-facing API via HTTP.
8.  Build a minimal UI to serve reader endpoints and content.
9.  Run acceptance checks and validate the Alpha user journey. 
    

## Next Steps (Beta) 
The remaining functionality to be implemented in the complete Beta app are as follows: 

1. UI and application interface polishing
2. Polished template document rendering.
3. Navigation and article search
4. Complete reader progress support 
5. Application deployment

### Potential Future Expansions

1. Authenticating and authorization 
2. Live document editing 
3. Contribution and moderation workflows
4. Directory navigation w/ full search
5. Media management (e.g. file uploads)
6. Hub theme and layout customization
